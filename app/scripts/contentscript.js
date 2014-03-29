'use strict';

var users = {},
		stories = {},
		assignments = {},
		user_assignments = {},
		currentMoment = moment();

// create user_assignments map 
function build_user_assignments(){
	$.each( assignments, function(i, assig){
		var story =  stories[parseInt(assig.story_id,10)],
				assignee_id = parseInt(assig.assignee_id,10),
				assignee =  users[assignee_id];

		if(!user_assignments[assignee_id]) {
			user_assignments[assignee_id] = {
				full_name : assignee.full_name,
				photo_path : assignee.photo_path,
				assignments : [],
				weekly : {},
				workspace_weekly_assignments : {}
			};
		}
		// fill up the assignments array
		user_assignments[assignee_id].assignments.push(
			{
				workspace : story.workspace_id,
				hours : assig.allocated_minutes/60,
				start_date : story.start_date ? moment(story.start_date).toDate() : null, //moment parse is needed to prevent date format YYYY-MM-DD from being parsed as UTC
				due_date : story.due_date ? moment(story.due_date).toDate() : null,
				title: story.title,
			}
		);
	});
	//#TODO shoultdn't have to go through this array again...
	$.each( user_assignments, function(ua_key, ua){
		//sum and populate weekly map	
		$.each(ua.assignments, function(assig_key, assig) {
			//#TODO find out why due date is null sometimes
			if ( !assig.due_date || moment(assig.due_date).isBefore(currentMoment) ){ return;}
			var start = assig.start_date ? moment(assig.start_date) : currentMoment, //where a task has already been started, the start date will be null
					due = moment(assig.due_date),
					weeksCount = start.diff(due, 'weeks')+1;

			// create workspace_weekly_hours key if it doesn't exist
			var wwh = ua.workspace_weekly_assignments[assig.workspace];
			if(!wwh) {
				wwh = ua.workspace_weekly_assignments[assig.workspace] = {};
			}

			//loop through week duration of assignment
			for (var i = 0; i < weeksCount; i++) {
				var m = start.clone().add(i,'weeks');
				// create weekly key if it doesn't exist
				var weekly = ua.weekly[m.week()];
				if(!weekly) {
					weekly = ua.weekly[m.week()] = {
						hours: 0
					};
				}
				// sum hours (split by duration if needed)
				weekly.hours += (assig.hours / weeksCount);

				if(!wwh[m.week()]){
					wwh[m.week()] = {
						hours : 0
					};
				}

				wwh[m.week()].hours += (assig.hours / weeksCount);

			}
		});
	});
}

function buildUI(){
	var futureWeekCount = 12,
			resultHTML = '';

	function utilizationClass(hours){
		return (hours < 38 ? 'under-utilized' : (hours > 42 ? 'over-utilized' : 'utilized') );
	}

	resultHTML += '<table class="me__resource-table"><tr><th>People</th>';
	for (var i = 0; i < futureWeekCount; i++) {
		var m = currentMoment.clone().add(i,'weeks');
		resultHTML += '<th>WK ' + m.week() + ' ' + m.day(0).format('MM/DD') + '</th>';
	}
	resultHTML += '</tr>';

	$.each( user_assignments, function(ua_key, ua){
		//one row per user
		//one cell per week
		var hourSumCells = '';
		for (var i = 0; i < futureWeekCount; i++) {
			var m = currentMoment.clone().add(i,'weeks');
			var roundedHours = ua.weekly[ m.week() ] ? Math.round((ua.weekly[ m.week() ].hours || 0)*10)/10 : 0;
			hourSumCells += '<td><div class="'+ utilizationClass(roundedHours) +'">' + roundedHours + '</td>';
			//var workspaceHourCells += '<td><div class="'+ utilizationClass(roundedHours) +'">' + roundedHours + '</td>';
		}
		//one row per project
		//one cell per week per project

		//one row per project assigment
		//assignmentHTML += '<li>' + assig.workspace + ', ' + assig.title + ', ' + start.format('MM/DD') + ' - ' + due.format('MM/DD') + '</li>';
		var projectRows = '';
		$.each( ua.workspace_weekly_assignments, function(wwa_key, wwa){
			var projectCells = '';

			// #TODO consolidate with week loop with  the previous one
			for (var i = 0; i < futureWeekCount; i++) {
				var m = currentMoment.clone().add(i,'weeks');
				var roundedHours = wwa[ m.week() ] ? Math.round((wwa[ m.week() ].hours || 0)*10)/10 : 0;
				projectCells += '<td>' + roundedHours + '</td>';
			}

			projectRows +=
				'<tr>' +
					'<td data-uid="'+i+'">' + wwa_key + '</td>' +
					projectCells +
				'</tr>';
		});

		resultHTML +=
			'<tr>' +
				'<td data-uid="'+i+'">' + users[ua_key].full_name + '</td>' +
				hourSumCells +
			'</tr>'+
			projectRows;
	});

	resultHTML +='</table>';
	$('body').append(resultHTML);
}

function fetchData(page){
	page = page || 1;
	$.getJSON(
		//need to figure out how to start with current week and potentially, limit to a # of weeks in future. 
		//Right now it just gets everything except archived projects
		'https://app.mavenlink.com/api/v1/assignments.json?include=story,assignee&current=true&per_page=200&page='+page,
		function(json) {
			$.extend(users, json.users);
			$.extend(stories, json.stories);
			$.extend(assignments, json.assignments);
			if(json.count && json.count > page * 200){
				fetchData(page+1);
			} else {
				build_user_assignments();
				buildUI();
				console.log(user_assignments)
			}
		}
	);
}

$('.navigation .left-nav-footer').append('<a href="#resource-allocation" id="me--fetch-trigger">Resource Allocation</a>');
$('#me--fetch-trigger').on('click',function(){ fetchData(); });
