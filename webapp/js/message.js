var otherChatterMessageTemplate = _.template(' \
	<div style="margin: 16px;" id="message-<%= id %>"> \
		<span style="color: #929197; font-size: 12px; display: <%= chat %>" class="chattername"><%= chatter %></span> \
		<div class="row" style="border-radius: 16px; padding: 8px 16px 8px 16px; background-color: #e6e5eb;"> \
			<%= message %> \
		</div> \
	</div>'
);

var myMessageTemplate = _.template(' \
	<div style="margin: 16px;"> \
		<div class="row" style="border-radius: 16px; padding: 8px 16px 8px 16px; background-color: #027bfe; color: #fbfeff;"> \
			<%= message %> \
		</div> \
	</div>'
);

var contact;
var latestMessageText = "";

function getContactId() {
	return $('#conversationcontainer').attr('data-id');
}

function loadMessages() {
	var isChat = false;
	var chatTitle = "";
	contact = getContactId().trim();

	if (contact.indexOf('-chat') > -1) {
		$("#contactname").text(contact.split('-chat')[0]);
		contact = 'chat'+contact.split('-chat')[1];
		isChat = true;
	} else if (contact.indexOf('@') === -1) {
		$.get("/getNameFromPhone/" + contact, function(data) {
			if (data.trim() === "") {
				$("#contactname").text(contact);
				return;
			}

			$("#contactname").text(data);
		});
	} else {
		$("#contactname").text(contact);
	}

	$.get("/getAllMessagesInChat/" + contact, function(data) {
		$("#messagelist").empty();
		$.each(data, function(index, message) {
			if (message.chatter === "me") {
				$("#messagelist").append(
					myMessageTemplate({message: message.text})
				);
			} else {
				$("#messagelist").append(
					otherChatterMessageTemplate({chatter: message.chatter, message: message.text, chat: ((isChat) ? 'block' : 'none'), id: index})
				);

				if (isChat) {
					$.get("/getNameFromPhone/" + message.chatter, function(data) {
						if (data.trim() === "") {
							return;
						}

						$("#message-"+index).find('.chattername').text(data);
					});
				}
			}
			latestMessageText = message.text;
		});
		$('#conversationcontainer').removeClass('hide');
		$('#conversationlistcontainer').addClass('hide');
		$("html, body").animate({ scrollTop: $(document).height() }, "slow");
	});
}

setInterval(function() {
	if (!contact) {
		return;
	}

	$.get("/getLastMessageInChat/" + contact, function(data) {
		if (data.text !== latestMessageText) {
			loadMessages();
		} else {
			// console.log('no need to reload messages current message is ' + data.text);
		}
	});
}, 5000)

var enterKeyListener = function(event) {
	// console.log(event);
	var keycode = parseInt(event.keyCode ? event.keyCode : event.which);
	if (keycode === 13) {
		var msg = $('#newmessagetext').val();
		$('#newmessagetext').val('');
		$.ajax({
			type: "POST",
			url: "/sendNewMessage",
			data: { to: contact, message: msg },
			success: function() {
				loadMessages();
			},
			dataType: "json"
		});
	}
};

var backToContactListClick = function() {
	$('#conversationcontainer').addClass('hide');
	$('#conversationlistcontainer').removeClass('hide');
};