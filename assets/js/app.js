var Hangouts = {}; // Main object for raw hangouts data
var Conversations = {};
var all_participants = {};
var inviter = {
	'gaia_id': null,
	'fallback_name': null
};

function readJSON() {
	var input = $('.btn :file'),
		numFiles = input.get(0).files ? input.get(0).files.length : 1,
		label = input.val().replace(/\\/g, '/').replace(/.*\//, '');
	input.trigger('fileselect', [numFiles, label]);
}

$('.btn-file :file').on('fileselect', function(event, numFiles, label) {
	$('.file-name').val(label);

	// Process file
	var file = document.getElementById("file-upload").files[0];
	if (file) {
		var reader = new FileReader();
		reader.readAsText(file, "UTF-8");
		reader.onload = function(evt) {
			Hangouts = JSON.parse(evt.target.result);
			console.log("Loaded: " + evt.target.result.length);
		        processData();
		}
		reader.onerror = function(evt) {
			alert("Error reading file");
		}
	}
});

function processData() {
	if (Hangouts['conversation_state']) {
	    processDataV1();
	} else {
	    processDataV2();
	}
}

function processDataV1() {
	// Remove previous conversations
	$('li.convo').remove();
	
	// First we want to get all participants, so we loop fully once
	for (key in Hangouts['conversation_state']) {
		console.log('key=' + key);
		var conversation_state = Hangouts['conversation_state'][key]['conversation_state'];
		if (!conversation_state) {
			continue;
		}
		var conversation = conversation_state['conversation'];

		// Get inviter data
		inviter['gaia_id'] = conversation['self_conversation_state']['inviter_id']['gaia_id'];

		// Get all participants
		for (person_key in conversation['participant_data']) {
			var person = conversation['participant_data'][person_key];
			var gaia_id = person['id']['gaia_id'];

			if (!person['fallback_name'] || person['fallback_name'] == null) continue;

			if (!all_participants[gaia_id])
				all_participants[gaia_id] = person['fallback_name'];
		}

	}

	for (key in Hangouts['conversation_state']) {

		var conversation_state = Hangouts['conversation_state'][key];
		if (!conversation_state['conversation_state']) {
			continue;
		}
		var id = conversation_state['conversation_id']['id'];
		var conversation = conversation_state['conversation_state']['conversation'];

		// Find participants
		var participants = [];
		var participants_obj = {};

		for (person_key in conversation['participant_data']) {
			var person = conversation['participant_data'][person_key];
			var gaia_id = person['id']['gaia_id'];
			var name = "Unknown";

			if (person['fallback_name']) {
				name = person['fallback_name'];
			} else {
				name = all_participants[gaia_id];
			}

			if (gaia_id == inviter['gaia_id']) {
				inviter['fallback_name'] = name;
			} else {
				participants.push(name);
				participants_obj[gaia_id] = name;
			}
		}
		var participants_string = participants.join(", ");

		// Add to list
		$(".convo-list").append('<li class="convo"><a href="javascript:void(0);" onclick="switchConvo(' + "'" + id + "'" + ')" class="waves-effect convo">' + participants_string + '</a></li>');

		// Parse events
		var events = [];
		for (event_key in conversation_state['conversation_state']['event']) {
			var convo_event = conversation_state['conversation_state']['event'][event_key];
			var timestamp = convo_event['timestamp'];
			var msgtime = formatTimestamp(timestamp);
			var sender = convo_event['sender_id']['gaia_id'];
			var isme = (inviter['gaia_id'] == sender) ? true : false;
			var message = "";

			if (convo_event['chat_message']) {

				// Get message
				for (msg_key in convo_event['chat_message']['message_content']['segment']) {
					var segment = convo_event['chat_message']['message_content']['segment'][msg_key];
					if (segment['type'] == 'LINE_BREAK') message += "\n";
					if (!segment['text']) continue;
					message += twemoji.parse(segment['text']);
				}

				// Check for images on event
				if (convo_event['chat_message']['message_content']['attachment']) {
					for (var attach_key in convo_event['chat_message']['message_content']['attachment']) {
						var attachment = convo_event['chat_message']['message_content']['attachment'][attach_key];
						console.log(attachment);
						if (attachment['embed_item']['type'][0] == "PLUS_PHOTO") {
							message += "\n<a target='blank' href='" + attachment['embed_item']['embeds.PlusPhoto.plus_photo']['url'] + "'><img class='content' src='" + attachment['embed_item']['embeds.PlusPhoto.plus_photo']['thumbnail']['image_url'] + "' /></a>";
						}
					}
				}

				events.push({
					msgtime: msgtime,
					sender: participants_obj[sender],
					isme: isme,
					message: message,
					timestamp: timestamp
				});
			}
		}

		// Sort events by timestamp
		events.sort(function(a, b) {
			var keyA = a.timestamp,
				keyB = b.timestamp;
			if (keyA < keyB) return -1;
			if (keyA > keyB) return 1;
			return 0;
		});

		// Add events
		Conversations[id] = events;

	}
}


function processDataV2() {
	// Remove previous conversations
	$('li.convo').remove();
	
	// First we want to get all participants, so we loop fully once
	for (key in Hangouts['conversations']) {
		var conversation = Hangouts['conversations'][key]['conversation']['conversation'];

		// Get inviter data
		inviter['gaia_id'] = conversation['self_conversation_state']['inviter_id']['gaia_id'];

		// Get all participants
		for (person_key in conversation['participant_data']) {
			var person = conversation['participant_data'][person_key];
			var gaia_id = person['id']['gaia_id'];

			if (!person['fallback_name'] || person['fallback_name'] == null) continue;

			if (!all_participants[gaia_id])
				all_participants[gaia_id] = person['fallback_name'];
		}

	}

	for (key in Hangouts['conversations']) {

		var conversation = Hangouts['conversations'][key];
		var id = conversation['conversation']['conversation_id']['id'];

		// var conversation_state = Hangouts['conversations'][key];
		// var conversation = conversation_state['conversations']['conversation'];

		// Find participants
		var participants = [];
		var participants_obj = {};

		for (person_key in conversation['conversation']['conversation']['participant_data']) {
			var person = conversation['conversation']['conversation']['participant_data'][person_key];
			var gaia_id = person['id']['gaia_id'];
			var name = "Unknown";

			if (person['fallback_name']) {
				name = person['fallback_name'];
			} else {
				name = all_participants[gaia_id];
			}

			if (gaia_id == inviter['gaia_id']) {
				inviter['fallback_name'] = name;
			} else {
				participants.push(name);
				participants_obj[gaia_id] = name;
			}
		}
		var participants_string = participants.join(", ");

		// Add to list
		$(".convo-list").append('<li class="convo"><a href="javascript:void(0);" onclick="switchConvo(' + "'" + id + "'" + ')" class="waves-effect convo">' + participants_string + '</a></li>');

		// Parse events
		var events = [];
		for (event_key in conversation['events']) {
			var convo_event = conversation['events'][event_key];
			var timestamp = convo_event['timestamp'];
			var msgtime = formatTimestamp(timestamp);
			var sender = convo_event['sender_id']['gaia_id'];
			var isme = (inviter['gaia_id'] == sender) ? true : false;
			var message = "";

			if (convo_event['chat_message']) {

				// Get message
				for (msg_key in convo_event['chat_message']['message_content']['segment']) {
					var segment = convo_event['chat_message']['message_content']['segment'][msg_key];
					if (segment['type'] == 'LINE_BREAK') message += "\n";
					if (!segment['text']) continue;
					message += twemoji.parse(segment['text']);
				}

				// Check for images on event
				if (convo_event['chat_message']['message_content']['attachment']) {
					for (var attach_key in convo_event['chat_message']['message_content']['attachment']) {
						var attachment = convo_event['chat_message']['message_content']['attachment'][attach_key];
						console.log(attachment);
						if (attachment['embed_item']['type'][0] == "PLUS_PHOTO") {
							message += "\n<a target='blank' href='" + attachment['embed_item']['plus_photo']['url'] + "'><img class='content' src='" + attachment['embed_item']['plus_photo']['thumbnail']['image_url'] + "' /></a>";
						}
					}
				}

				events.push({
					msgtime: msgtime,
					sender: participants_obj[sender],
					isme: isme,
					message: message,
					timestamp: timestamp
				});
			}
		}

		// Sort events by timestamp
		events.sort(function(a, b) {
			var keyA = a.timestamp,
				keyB = b.timestamp;
			if (keyA < keyB) return -1;
			if (keyA > keyB) return 1;
			return 0;
		});

		// Add events
		Conversations[id] = events;

	}
}

function switchConvo(id) {
	$('#modal-load').modal({
		dismissible: false,
		ready: function(modal, trigger) {
			var chunk = Conversations[id].length;
			var index = 0;
			$('.chat').text('');
			setTimeout(displayChat(Conversations[id], index, chunk), 3000);
			$('#modal-load').modal('close');
		}
	});
	$('#modal-load').modal('open');
}

function displayChat(convo, index, chunk) {
	for (var event_id in convo) {
		var convo_event = convo[event_id];
		if (index == Math.round(chunk * 0.20) || index == Math.round(chunk * 0.40) || index == Math.round(chunk * 0.60) || index == Math.round(chunk * 0.80)) {
			setTimeout(displayChat(), 5);
		}
		if (convo_event.isme == true) {
			$('.chat').append(
				'<div class="message me"><img class="user" src="assets/img/avatar.png"/><div><p class="bubble">' +
				convo_event.message +
				'</p><small>' + humanizeDate(convo_event.msgtime) + '</small></div>'
			);
		} else {
			$('.chat').append(
				'<div class="message"><img class="user" src="assets/img/avatar.png"/><div><p class="bubble">' +
				convo_event.message +
				'</p><br><small>' + humanizeDate(convo_event.msgtime) + '</small></div>'
			);
		}
		index++;
	}
}

function zeroPad(string) {
	return (string < 10) ? "0" + string : string;
}

function formatTimestamp(timestamp) {
	var d = new Date(timestamp / 1000);
	var formattedDate = d.getFullYear() + "-" +
		zeroPad(d.getMonth() + 1) + "-" +
		zeroPad(d.getDate());
	var hours = zeroPad(d.getHours());
	var minutes = zeroPad(d.getMinutes());
	var formattedTime = hours + ":" + minutes;
	return formattedDate + " " + formattedTime;
}

function humanizeDate(string) {
	moment.calendarFormat = function(myMoment, now) {
		var diff = myMoment.diff(now, 'days', true);
		var retVal = (myMoment.year() !== now.year()) ? 'sameElse' :
			(diff < -1 && diff > -8) ? 'lastWeek' :
			diff == -1 ? 'lastDay' :
			diff == 0 ? 'sameDay' :
			(myMoment.year() === now.year()) ? 'sameYear' : 'sameElse';
		return retVal;
	};
	return moment(string).calendar(null, {
		sameDay: 'h:mm a',
		sameYear: 'MMM DD, h:mm a',
		lastDay: '[Yesterday], h:mm a',
		lastWeek: 'ddd, h:mm a',
		sameElse: 'MMM DD YYYY, h:mm a'
	});
}
