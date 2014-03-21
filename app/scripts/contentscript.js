'use strict';

//get all users
//https://api.mavenlink.com/api/v1/users.json

//get all story_allocation_days by user starting with the current month
//

var users = {};
var stories = {};
var assignments = {};
var user_assigments = {};

$.getJSON(
	'https://app.mavenlink.com/api/v1/assignments.json?include=story,assignee',
	function(json) { 
		users = json.users;
		stories = json.stories;
		assignments = json.assignments;
	}
);


$(assignments).each( function(i, assig){
	console.log(assig)
	var story =  stories[parseInt(assig.story_id)];
	var assignee_id = parseInt(assig.assignee_id);
	if(!user_assigments[assignee_id]) {
		user_assigments[assignee_id] = { assignments : [] };
	}
	console.log(story)
	user_assigments[assignee_id].assignments.push(
		{
			workspace : story.workspace_id,
			minutes : assig.allocated_minutes,
			start_date : parseDate(story.start_date),
			due_date : parseDate(story.due_date)
		}
	);

	function parseDate(date){
		//accepts YYYY-MM-DD
		var d = date.split('-');
		return new Date(d[0],d[1]-1,d[2]);
	}
	
});


// user_assigments = {
// 	3966535 : {
// 		assignments : [
// 			{
// 				minutes : 100,
// 				start_date : "2014-03-11",
// 				due_date : "2014-03-12"
// 			}	
// 		]
// 	}
// };

//make day/week buckets