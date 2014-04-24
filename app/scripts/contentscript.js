'use strict';

var Users = {},
		Stories = {},
		Workspaces = {},
		Assignments = {},
		AllocationDays = {},
		user_assignments = {},
		currentMoment = moment(),
		futureWeekCount = 12;

// create user_assignments map
function build_user_assignments(){
	$.each( AllocationDays, function(alloc_day_key, allocation_day){
		var story_id = parseInt(allocation_day.story_id,10),
				story =  Stories[story_id],
				assignment_id = allocation_day.assignment_id,
				assignment = Assignments[parseInt(assignment_id,10)],
				assignee_id = parseInt(assignment.assignee_id,10),
				assignee =  Users[assignee_id],
				workspace_id = parseInt(story.workspace_id,10),
				hours = parseInt(allocation_day.minutes,10)/60;

		if(!user_assignments[assignee_id]) {
			user_assignments[assignee_id] = {
				full_name : assignee.full_name,
				photo_path : assignee.photo_path,
				assignments : {},
				workspaces : {},
				allocation_days : {},
				weekly_hours : {}
			};
		}

		// fill up the user_assignments.workspaces map
		if(!user_assignments[assignee_id].workspaces[workspace_id]){
			user_assignments[assignee_id].workspaces[workspace_id] = {
				title  : Workspaces[workspace_id].title,
				assignments : {}
			};
		}

		// fill up the user_assignments.workspaces.assigments map
		var user_workspace_assignment = user_assignments[assignee_id].workspaces[workspace_id].assignments[story_id];
		if( !user_workspace_assignment ){
			user_workspace_assignment = user_assignments[assignee_id].workspaces[workspace_id].assignments[story_id] = {
				hours : assignment.allocated_minutes/60,
				weekly_hours : {},
				start_date : story.start_date ? moment(story.start_date).toDate() : null, //moment parse is needed to prevent date format YYYY-MM-DD from being parsed as UTC
				due_date : story.due_date ? moment(story.due_date).toDate() : null,
				title: story.title
			};
		}

		//assignment level weekly hour sum
		var weekNumber = moment(allocation_day.date).week();
		if(!user_workspace_assignment.weekly_hours[weekNumber]){
			user_workspace_assignment.weekly_hours[weekNumber] = {
				hours : 0
			};
		}
		user_workspace_assignment.weekly_hours[weekNumber].hours += hours;

		//user level weekly hour sum
		if(!user_assignments[assignee_id].weekly_hours[weekNumber]){
			user_assignments[assignee_id].weekly_hours[weekNumber] = {
				hours : 0
			};
		}
		user_assignments[assignee_id].weekly_hours[weekNumber].hours += hours;

	});
}

function buildView() {
	var resultHTML = '';

	function utilizationClass(hours){
		return (hours < 38 ? 'under-utilized' : (hours > 42 ? 'over-utilized' : 'utilized') );
	}

	resultHTML += '<tr><th>People</th>';
	for (var i = 0; i < futureWeekCount; i++) {
		var m = currentMoment.clone().add(i,'weeks');
		resultHTML += '<th>WK-' + m.week() + '<br>' + m.day(0).format('MM/DD') + '</th>';
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
					var roundedHours = assig.weekly_hours[m.week()] ? assig.weekly_hours[m.week()].hours : 0;
					assignmentHoursCells += '<td>' + roundedHours + '</td>';
				}

				assignmentRows +=
						'<tr class="assignment-row '+workspace_key+'">' +
							'<td class="" title="' + assig.hours + ' total hours" data-assignmentid="'+assig_key+'">' + assig.title + '</td>' +
							assignmentHoursCells +
						'</tr>';
			});

			workspaceRows +=
				'<tr class="workspace-row '+ua_key+'">' +
					'<td class="trigger" data-workspaceid="'+workspace_key+'">' + Workspaces[workspace_key].title + '<div class="triangle"></div></td>' +
					'<td colspan="'+ futureWeekCount +'"></td>' +
				'</tr>' +
				assignmentRows;

		});

		resultHTML +=
			'<tbody>' +
				'<tr  class="user-row">' +
					'<td class="trigger" data-userid="'+ua_key+'">' + Users[ua_key].full_name + '<div class="triangle"></div></td>' +
					hourSumCells +
				'</tr>'+
					workspaceRows +
			'</tbody>';
	});


	$('body').append(
		'<div class="me__resource">'+
			'<div class="me__resource-wrap">'+
				'<div class="close">&otimes;</div>' +
				'<table class="me__resource-table">' +
					resultHTML +
				'</table>' +
			'</div>' +
		'</div>'
	);
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

	var usersComplete = false;
	function fetchUsers(page){
		page = page || 1;
		$.getJSON(
			'https://app.mavenlink.com/api/v1/users.json?&per_page=200&page='+page,
			function(json) {
				$.extend(Users, json.users);
				if(json.count && json.count > page * 200){
					fetchUsers(page+1);
				} else {
					usersComplete = true;
					initView();
				}
			}
		);
	}

	var allocationDaysComplete = false;
	function fetchAllocationDays(page, dateBetween){
		page = page || 1;
		dateBetween = dateBetween || currentMoment.day(0).format('YYYY-MM-DD') + ':' +
			currentMoment.clone().day(6).add(futureWeekCount,'weeks').format('YYYY-MM-DD');

		$.getJSON(
			//#TODO date_between- Requires a colon separated pair of dates in YYYY-MM-DD format. Results are inclusive of the endpoints. If a date is not passed in, it is interpreted as negative or positive infinity
			'https://app.mavenlink.com/api/v1/story_allocation_days.json?'+
				'include=story,assignment&current=true&per_page=200&page='+page + '&date_between=' + dateBetween,
			function(json) {
				$.extend(Stories, json.stories);
				$.extend(Assignments, json.assignments);
				$.extend(AllocationDays, json.story_allocation_days);
				if(json.count && json.count > page * 200){
					fetchAllocationDays(page+1, dateBetween);
				} else {
					allocationDaysComplete = true;
					initView();
				}
			}
		);
	}

	function initView(){
		if(allocationDaysComplete && usersComplete && workspacesComplete){
			build_user_assignments();
			//console.log(user_assignments);
			buildView();

			$('tr.user-row .trigger').on('click', function(){
				var $this = $(this);
				$this.toggleClass('open');
				$(this).parents('tbody').find('tr.workspace-row').toggle();

				// unfortunate - need to close assignments if user row is collapsed before workspace row
				if( !$this.hasClass('open') ){
					$this.parents('tbody').find( 'tr.assignment-row' ).hide();
					$this.parents('tbody').find('.open').removeClass('open');
				}
			});

			$('tr.workspace-row .trigger').on('click', function(){
				var wid =  $(this).data('workspaceid'),
						$this = $(this);
				$this.toggleClass('open');
				$this.parents('tbody').find( 'tr.assignment-row.' + wid ).toggle();
			});

			$('.me__resource-wrap .close').on('click',function(){
				$('.me__resource').hide();
			});

			$(document).trigger('viewComplete');
		}
	}

	fetchUsers();
	fetchWorkspaces();
	fetchAllocationDays();
}

$('.navigation .left-nav-footer').append(
	'<a href="#resource-allocation" id="me--fetch-trigger" style="text-align: center;display: block;">Resource Allocation</a>'
);
$('#me--fetch-trigger').on('click',function(e){
	e.preventDefault();
	if( $('.me__resource')[0] ){
		$('.me__resource').show();
		return;
	}
	var $this = $(this),
			origText = $this.text();

	$this.text('loading...');
	fetchData();
	$(document).on('viewComplete', function(){
		$this.text(origText);
	});
});
