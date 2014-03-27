'use strict';

var users = {},
		stories = {},
		assignments = {},
		user_assignments = {};

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
				week_hours : {}
			};
		}
		// fill up the assignments array
		user_assignments[assignee_id].assignments.push(
			{
				workspace : story.workspace_id,
				hours : assig.allocated_minutes/60,
				start_date : Date.parse(story.start_date+'T08:00:00'),
				due_date : Date.parse(story.due_date+'T08:00:00'),
				title: story.title,
			}
		);

	});
}

function buildUI(){
	// #TODO start week on saturday instead of monday?
	// UI shows next 6 weeks
	var currentWeek = moment().week();
	var endWeek = 12 + currentWeek; //#todo account for when week wraps around the new year
	var resultHTML = '';

	function utilizationClass(hours){
		return (hours < 38 ? 'under-utilized' : (hours > 42 ? 'over-utilized' : 'utilized') );
	}

	resultHTML += '<table class="me__resource-table"><tr><th>People</th>';
	for (var i = currentWeek; i < endWeek+1; i++) {  //#todo account for when week wraps around the new year
		var m = moment().year(2014).week(i); //#TODO need to use a real year hear
		resultHTML += '<th>WK ' + i + ' ' + m.day(0).format('MM/DD') + '</th>';
	}
	resultHTML += '</tr>';



	$.each( user_assignments, function(i, ua){
		var assignmentHTML = '<ul>';
		//sum and populate week_hours	
		$.each(ua.assignments, function(i, assig) {
			//#TODO find out why these are null sometimes
			if (!assig.start_date || !assig.due_date){ return;}

			var start_week = assig.start_date ? moment(assig.start_date).week() : currentWeek, //where a task has already been started, the start date will null
					due_week = moment(assig.due_date).week();
			for (var i = start_week; i < due_week+1; i++) { //#todo account for when week wraps around the new year
				// create if it doesn't exist
				if(!ua.week_hours[i]) { ua.week_hours[i] = 0; }
				ua.week_hours[i] += (assig.hours / (due_week - start_week + 1));
			}
			// if(assig.due_date > getDateOfWeek(currentWeek, (new Date()).getYear) ){
			// 	assignmentHTML += '<li>' + assig.workspace + ', ' + assig.title + ', ' + assig.start_date + ' - ' + assig.due_date + '</li>';
			// }

		});
		assignmentHTML += '</ul>';

		//one row per user
		resultHTML += '<tr>';
		resultHTML += '<td data-uid="'+i+'">' + users[i].full_name + '</td>';
		//one cell per week
		for (var i = currentWeek; i < endWeek+1; i++) {//#todo account for when week wraps around the new year (if due is less than start)
			var roundedHours = Math.round((ua.week_hours[i] || 0)*10)/10;
			resultHTML += '<td><div class="'+ utilizationClass(roundedHours) +'">' + roundedHours + '</td>';
		}
		resultHTML += '</tr>' +
			'<tr><td colspan="13">'+assignmentHTML+'</td></tr>';
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
			}
		}
	);
}

$('.navigation .left-nav-footer').append('<a href="#resource-allocation" id="me--fetch-trigger">Resource Allocation</a>');
$('#me--fetch-trigger').on('click',function(){ fetchData(); });
