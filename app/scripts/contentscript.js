'use strict';

Date.prototype.getWeekNumber = function(){
    var d = new Date(+this);
    d.setHours(0,0,0);
    d.setDate(d.getDate()+4-(d.getDay()||7));
    return Math.ceil((((d-new Date(d.getFullYear(),0,1))/8.64e7)+1)/7);
};
function getDateOfWeek(w, y) {
    var d = (1 + (w - 1) * 7); // 1st of January + 7 days for each week
    return new Date(y, 0, d);
}
function parseDate(date){
	//accepts YYYY-MM-DD
	if (!date){ return; }
	var d = date.split('-');
	return new Date(d[0],d[1]-1,d[2]);
}

var $ = null || jQuery,
		users = {},
		stories = {},
		assignments = {},
		user_assignments = {};

// create user_assignments map 
function build_user_assignments(){
	$.each( assignments, function(i, assig){
		var story =  stories[parseInt(assig.story_id,10)];
		var assignee_id = parseInt(assig.assignee_id,10);
		var assignee =  users[assignee_id];
		var start_date = parseDate(story.start_date);
		var due_date = parseDate(story.due_date);

		if(!user_assignments[assignee_id]) {
			user_assignments[assignee_id] = {
				full_name : assignee.full_name,
				photo_path : assignee.photo_path,
				assignments : [],
				week_hours : {}
			};
		}

		user_assignments[assignee_id].assignments.push(
			{
				workspace : story.workspace_id,
				hours : assig.allocated_minutes/60,
				start_date : start_date,
				due_date : due_date
			}
		);

	});
}

function buildUI(){
	// #TODO start week on saturday instead of monday?
	// UI shows next 6 weeks
	var currentWeek = (new Date()).getWeekNumber();
	var endWeek = 12 + currentWeek; //#todo account for when week wraps around the new year
	var resultHTML = '';

	function utilizationClass(hours){
		return (hours < 38 ? 'under-utilized' : (hours > 42 ? 'over-utilized' : 'utilized') );
	}

	resultHTML += '<table class="me__resource-table"><tr><th>People</th>';
	for (var i = currentWeek; i < endWeek+1; i++) {  //#todo account for when week wraps around the new year
		var d = getDateOfWeek(i, 2014);
		resultHTML += '<th>WK ' + i + ' ' + (d.getMonth()+1) + '/' + d.getDate() + '</th>';
	}
	resultHTML += '</tr>';

	$.each( user_assignments, function(i, ua){
		//sum and populate week_hours
		$.each(ua.assignments, function(i, assig) {
			if (!assig.start_date || !assig.due_date){ //#find out why these are null sometimes
				return;
			}
			var start_week = assig.start_date ? assig.start_date.getWeekNumber() : (new Date()).getWeekNumber(), //where a task has already been started, the start date will null
					due_week = assig.due_date.getWeekNumber();
			for (var i = start_week; i < due_week+1; i++) { //#todo account for when week wraps around the new year
				if(!ua.week_hours[i]) {
					ua.week_hours[i] = 0;
				}
				ua.week_hours[i] = ua.week_hours[i] + (assig.hours / (due_week - start_week + 1));
			}
		});
		
		//one row per user
		resultHTML += '<tr>';
		resultHTML += '<td class="'+i+'">' + users[i].full_name + '</td>';
		//one cell per week
		for (var i = currentWeek; i < endWeek+1; i++) {//#todo account for when week wraps around the new year
			var roundedHours = Math.round((ua.week_hours[i] || 0)*10)/10;
			resultHTML += '<td><div class="'+ utilizationClass(roundedHours) +'">' + roundedHours + '</td>';
		}
		resultHTML += '</tr>';
	});

	resultHTML +='</table>';
	$('body').append(resultHTML);
}
function fetchData(page){
	$.getJSON(
		//need to figure out how to start with current week and potentially, limit to a # of weeks in future 
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
$('#me--fetch-trigger').on('click',function(){ fetchData(1); });
