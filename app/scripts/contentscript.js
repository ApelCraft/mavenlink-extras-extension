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
		
	}
);


function parseDate(date){
	//accepts YYYY-MM-DD
	if (!date){ return; }
	var d = date.split('-');
	return new Date(d[0],d[1]-1,d[2]);
}

// create user_assignments map 
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
			weekly_assignments : []
		};
	}

	user_assignments[assignee_id].assignments.push(
		{
			workspace : story.workspace_id,
			minutes : assig.allocated_minutes,
			start_date : start_date,
			due_date : due_date
		}
	);
});

//calculate how many hours in a given week per user


//make 8 buckets for the next 8 weeks
//according to iso spec week starts on monday?
	
var currentWeek = (new Date()).getWeekNumber();
var endWeek = 6 + currentWeek;

//one row per user
//one cell per week

$('.logo')[0].style.backgroundColor ='red';
//$(user_assignments).each(k,v){
//	make a new row for each user assignment
//	go through all assignments	

//}
