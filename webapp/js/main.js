var template = _.template(' \
	<div class="row" style="border-bottom: 1px solid #c7c7c9; min-height: 112px;" id="chat-<%= id %>" data-chat-id="<%= chatid %>"> \
		<div class="initialtext" style="float: left; width: 64px; background-color: #c8c7cd; border-radius: 32px; height: 64px; color: #ffffff; margin-top: 22px; padding-top: 12px; margin-left: 22px; text-align: center; font-size: 28px;"> \
			<%= initial %> \
		</div> \
		<div style="max-width: 59%; float: left;"> \
			<h3 style="padding-left: 16px; float: left; max-width: 100%; white-space: nowrap;overflow: hidden; text-overflow: ellipsis;" class="chattername"><%= chatter %></h3><br> \
			<div style="float: left; color: #8d8c92; padding-left: 16px; max-width: 100%;white-space: nowrap;overflow: hidden; text-overflow: ellipsis" class="col-lg-8 messagetext"> \
				<%= message %> \
			</div> \
		</div> \
		<div style="float: right; color: #8d8c92; padding-right: 16px; padding-top: 9px;padding-left:0px;" class="col-lg-4"> \
			<span style="font-size: 25px; color: #cac9ce;" class="" aria-hidden="true"><span style="color: #8d8c92; font-size: 20px;"></span>&nbsp;&nbsp;> </span> \
		</div> \
	</div>'
);

function loadChats() {
	$.get("/getChats", function(data) {
		$.each(data, function(index, chatId) {
			var chatTextName = chatId;
			if (chatTextName.indexOf('-chat') > -1) {
				chatTextName = chatTextName.split('-chat')[0];
			} else if (chatId.indexOf('@') === -1) {
				$.get("/getNameFromPhone/" + chatId, function(data) {
					if (data.trim() === "") {
						return;
					}

					$("#chat-"+index).find('.chattername').text(data);
					$("#chat-"+index).find('.initialtext').text(data.charAt(0));
				});
			}

			$("#chatlist").append(
				template({chatter: chatTextName, message: "", chatid: chatId, id: index, initial: ""})
			);

			$("#chat-"+index).click(function(e) {
				var chatId = $(e.currentTarget).attr('data-chat-id');
				$('#conversationcontainer').attr('data-id', chatId);
				loadMessages();
			});

			var chatString = chatId;
			if (chatString.indexOf('-chat') > -1) {
				chatString = 'chat'+chatString.split('-chat')[1];
			}

			$.get("/getLastMessageInChat/" + chatString, function(data) {
				$("#chat-"+index).find('.messagetext').text(data.text);
			});

			$("#chat-"+index).find('.initialtext').text(chatTextName.charAt(0));
		});
	});
}
var newConversationEnterKeyListener = function(event) {
	var keycode = parseInt(event.keyCode ? event.keyCode : event.which);
	if (keycode === 13) {
		var msg = $('#newconversationmessagetext').val();
		$.ajax({
			type: "POST",
			url: "/sendNewMessage",
			data: { to: $('#newconversationcontactname').val(), message: msg },
			success: function() {
			},
			dataType: "application/json"
		});
		$('newconversationmessagetext').attr("disabled", "disabled");
		$('newconversationcontactname').attr("disabled", "disabled");

		// all we're going to do is fire off the req and then assume the server knew what to do with it
		setTimeout(function() {
			location.reload();
		}, 1000);
	}
};

$('#newmessagebutton').click(function() {
	$('#conversationlistcontainer').addClass('hide');
	$('#newconversationcontainer').removeClass('hide');
	$('#newconversationmessagetext').keydown(newConversationEnterKeyListener);
});

function checkKey(key) {
	$.ajax({
		type: "POST",
		url: "/checkKey",
		data: { key: ((key) ? key : $('#keyinput').val()) },
		success: function(data) {
			if (data.data === "ok") {
				loadChats();
				sessionStorage.setItem("key", ((key) ? key : $('#keyinput').val()));
				$('#keyinput').val('');
				$('#lockedcontainer').addClass('hide');
				$('#conversationlistcontainer').removeClass('hide');
			} else {
				$('#keyinput').css('border', '2px red dotted');
			}
		},
		dataType: "json"
	});
}

$('#unlockbutton').click(checkKey);

$('#keyinput').keydown(function(event) {
	var keycode = parseInt(event.keyCode ? event.keyCode : event.which);
	if (keycode === 13) {
		checkKey();
	}
});

$('#lock').click(function() {
	$('#lockedcontainer').removeClass('hide');
	$('#conversationlistcontainer').addClass('hide');
	sessionStorage.setItem("key", "");
	$.get("/signout", function(data) {});
});

$(document).ready(function() {
	if (sessionStorage.getItem("key") === "" || !sessionStorage.getItem("key")) {
		return;
	}

	checkKey(sessionStorage.getItem("key"));
});