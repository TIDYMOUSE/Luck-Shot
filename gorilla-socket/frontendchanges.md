1. JoinResponse => QueueAction
    - uid => content ("FOUND")
    - Action => QueueAction (for queue only)

2. "/join"(post) then "/start"(socket for queue and game) => "/join"(socket for queue) and "/game" (socket for game)



# CRITICAL 
1. Player ones join request (from "FOUND"):
	```json
		playerOne: selfAddress,
		playerTwo: queueAction.sender_address,
		uid: queueAction.content
	```
2. Player two's join request !!! (send with "READY"): 
	```json
		playerOne: queueAction.sender_address,
		playerTwo: selfAddress,
		uid: queueAction.content
	```
