'use strict';

Date.prototype.getWeekNumber = function(){
    var d = new Date(+this);
    d.setHours(0,0,0);
    d.setDate(d.getDate()+4-(d.getDay()||7));
    return Math.ceil((((d-new Date(d.getFullYear(),0,1))/8.64e7)+1)/7);
};
//get all users
//https://api.mavenlink.com/api/v1/users.json

//get all story_allocation_days by user starting with the current month
//

var $ = null || jQuery;
var users = {};
var stories = {};
var assignments = {};
var user_assignments = {};

$.getJSON(
	//need to figure out how to start with current week and potentially, end 8 weeks in future
	'https://app.mavenlink.com/api/v1/assignments.json?include=story,assignee',
	function(json) {
		users = json.users;
		stories = json.stories;
		assignments = json.assignments;
		build_user_assignments();
		buildUI();
	}
);


function parseDate(date){
	//accepts YYYY-MM-DD
	if (!date){ return; }
	var d = date.split('-');
	return new Date(d[0],d[1]-1,d[2]);
}

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
				hours : Math.round(assig.allocated_minutes/60 * 100) / 100,
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
	var endWeek = 12 + currentWeek;
	var resultHTML = '<table>'

	$.each( user_assignments, function(i, ua){
		//sum and populate week_hours
		$.each(ua.assignments, function(i, assig) {
			var start_week = assig.start_date ? assig.start_date.getWeekNumber() : (new Date()).getWeekNumber(), //where a task has already been started, the start date will null
					due_week = assig.due_date.getWeekNumber();
			for (var i = start_week; i < due_week+1; i++) {
				if(!ua.week_hours[i]) {
					ua.week_hours[i] = 0;
				}
				ua.week_hours[i] = ua.week_hours[i] + (assig.hours / (due_week - start_week + 1));
			}
		});
		
		//one row per user
		resultHTML += '<tr>';
		resultHTML += '<td>' + users[i].full_name + '</td>';
		//one cell per week
		for (var i = currentWeek; i < endWeek+1; i++) {
			resultHTML += '<td>' + (ua.week_hours[i] || 0) + '</td>';
		}
		resultHTML += '</tr>';
	});

	resultHTML +='</table>';
	$('body').append(resultHTML);	
}

$('.logo')[0].style.backgroundColor ='red';
