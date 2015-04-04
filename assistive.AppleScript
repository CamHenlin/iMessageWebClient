tell application "System Events" to if not UI elements enabled then
	tell me
		activate
		display dialog "This program requires OS X Assistive Access, which is currently disabled." & return & return & "Enable Assistive Access now? (You may be asked to enter your password.)" buttons {"Cancel", "Enable"} default button 2 with icon 2
	end tell
	set UI elements enabled to true
	if not UI elements enabled then error number -128
end if