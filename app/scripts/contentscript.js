'use strict';

var Users = {},
		Stories = {},
		Workspaces = {},
		Assignments = {},
		user_assignments = {},
		currentMoment = moment();

// create user_assignments map 
function build_user_assignments(){
	$.each( Assignments, function(assig_key, assig){
		var story_id = parseInt(assig.story_id,10),
				story =  Stories[story_id],
				assignee_id = parseInt(assig.assignee_id,10),
				assignee =  Users[assignee_id],
				workspace_id = parseInt(story.workspace_id,10),
				assig_hours = assig.allocated_minutes/60;

		// bail if the assignment is complete or from a previous week
		if ( !story.due_date || !moment(story.due_date).isValid() || moment(story.due_date).day(0).isBefore(currentMoment) ){ return;}

		if(!user_assignments[assignee_id]) {
			user_assignments[assignee_id] = {
				full_name : assignee.full_name,
				photo_path : assignee.photo_path,
				assignments : {},
				workspaces : {},
				weekly_hours : {}
			};
		}
		var tmp_assig = {};
		tmp_assig[story_id] = {
				workspace_id : workspace_id,
				hours : assig.allocated_minutes/60,
				start_date : story.start_date ? moment(story.start_date).toDate() : null, //moment parse is needed to prevent date format YYYY-MM-DD from being parsed as UTC
				due_date : story.due_date ? moment(story.due_date).toDate() : null,
				title: story.title
			};
		// fill up the assignments map
		$.extend(user_assignments[assignee_id].assignments, tmp_assig);

		// fill up the workspaces map
		if(!user_assignments[assignee_id].workspaces[workspace_id]){
			user_assignments[assignee_id].workspaces[workspace_id] = {
				title  : Workspaces[workspace_id].title,
				assignments : {}
			};
		}
		
		// fill up the workspaces.assigments map
		if( !user_assignments[assignee_id].workspaces[workspace_id].assignments[story_id] ){
			user_assignments[assignee_id].workspaces[workspace_id].assignments[story_id] = {
				hours : assig_hours,
				weekly_hours : {},
				start_date : story.start_date ? moment(story.start_date).toDate() : null, //moment parse is needed to prevent date format YYYY-MM-DD from being parsed as UTC
				due_date : story.due_date ? moment(story.due_date).toDate() : null,
				title: story.title
			};
		}
		
		var start = story.start_date ? moment(story.start_date) : currentMoment, //where a task has already been started, the start date will be null
				due = moment(story.due_date),
				weeksCount = due.day(0).diff(start.day(0), 'weeks')+1;

		//loop through week duration of assignment
		for (var i = 0; i < weeksCount; i++) {
			var m = start.clone().day(0).add(i,'weeks');
			// create weekly key if it doesn't exist
			var weekly_hours = user_assignments[assignee_id].weekly_hours[m.week()];
			if(!weekly_hours) {
				weekly_hours = user_assignments[assignee_id].weekly_hours[m.week()] = {
					hours: 0
				};
			}
			// sum hours (split by duration if needed)
			weekly_hours.hours += (assig_hours / weeksCount);
			// attach split duration to assigment
			user_assignments[assignee_id].workspaces[workspace_id].assignments[story_id].weekly_hours[m.week()] = (assig_hours / weeksCount);
		}

	});
}

function buildView() {
	var futureWeekCount = 12,
			resultHTML = '';

	function utilizationClass(hours){
		return (hours < 38 ? 'under-utilized' : (hours > 42 ? 'over-utilized' : 'utilized') );
	}

	resultHTML += '<table class="me__resource-table"><tr><th>People</th>';
	for (var i = 0; i < futureWeekCount; i++) {
		var m = currentMoment.clone().add(i,'weeks');
		resultHTML += '<th>WK-' + m.week() + ' ' + m.day(0).format('MM/DD') + '</th>';
	}
	resultHTML += '</tr>';

	$.each( user_assignments, function(ua_key, ua){
		//one row per user
		//one cell per week
		var hourSumCells = '';
		for (var i = 0; i < futureWeekCount; i++) {
			var m = currentMoment.clone().add(i,'weeks');
			var roundedHours = ua.weekly_hours[ m.week() ] ? Math.round((ua.weekly_hours[ m.week() ].hours || 0)*10)/10 : 0;
			hourSumCells += '<td><div class="'+ utilizationClass(roundedHours) +'">' + roundedHours + '</td>';
		}

		
		//one row per workspace
		var workspaceRows = '';
		$.each( ua.workspaces, function(workspace_key, workspace){
			
			//one row per assigment
			var assignmentRows = '';
			$.each( workspace.assignments, function(assig_key, assig){
				var assignmentHoursCells = '';
				//one cell per week
				for (var i = 0; i < futureWeekCount; i++) {
					var m = currentMoment.clone().day(0).add(i,'weeks');
					var roundedHours = assig.weekly_hours[m.week()] ? Math.round(assig.weekly_hours[ m.week() ]*10)/10 : 0;
					assignmentHoursCells += '<td>' + roundedHours + '</td>';
				}

				assignmentRows +=
					'<tr class="assignment-row">' +
						'<td data-assignmentid="'+assig_key+'">' + assig.title + ' - ' + assig.hours + '</td>' +
						assignmentHoursCells +
					'</tr>';
			});

			workspaceRows +=
				'<tr class="workspace-row">' +
					'<td data-workspaceid="'+workspace_key+'" colspan="'+futureWeekCount+'">' + Workspaces[workspace_key].title + '</td>' +
				'</tr>' +
				assignmentRows;

		});

		resultHTML +=
			'<tr  class="user-row">' +
				'<td data-uid="'+i+'">' + Users[ua_key].full_name + '</td>' +
				hourSumCells +
			'</tr>'+
			workspaceRows;
	});

	resultHTML +='</table>';
	$('body').append(resultHTML);
}

function fetchData(){
	var workspacesComplete = false;
	function fetchWorkspaces(page){
		page = page || 1;
		$.getJSON(
			'https://app.mavenlink.com/api/v1/workspaces.json?&per_page=200&page='+page,
			function(json) {
				$.extend(Workspaces, json.workspaces);
				if(json.count && json.count > page * 200){
					fetchWorkspaces(page+1);
				} else {
					workspacesComplete = true;
					initView();
				}
			}
		);
	}

	var assignmentsComplete = false;
	function fetchAssignments(page){
		page = page || 1;
		$.getJSON(
			//need to figure out how to start with current week and potentially, limit to a # of weeks in future. 
			//Right now it just gets everything except archived projects
			'https://app.mavenlink.com/api/v1/assignments.json?include=story,assignee&current=true&per_page=200&page='+page,
			function(json) {
				$.extend(Users, json.users);
				$.extend(Stories, json.stories);
				$.extend(Assignments, json.assignments);
				if(json.count && json.count > page * 200){
					fetchAssignments(page+1);
				} else {
					build_user_assignments();
					assignmentsComplete = true;
					initView();
					console.log(user_assignments);
				}
			}
		);
	}

	function initView(){
		if(assignmentsComplete && workspacesComplete){
			buildView();
		}
	}

	fetchWorkspaces();
	fetchAssignments();
}

$('.navigation .left-nav-footer').append('<a href="#resource-allocation" id="me--fetch-trigger">Resource Allocation</a>');
$('#me--fetch-trigger').on('click',function(){ fetchData(); });
