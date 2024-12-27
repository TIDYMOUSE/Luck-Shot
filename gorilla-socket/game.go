package main

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
)

// didnt get to use the select statement 😭 😭
// possible improvement: Rather than sending entire video url, send bool to indicate survival or loss
// type ShootAction struct {
// 	Type           string `json:"action"`
// 	ShooterAddress string `json:"shooter_address"`
// 	TargetAddress  string `json:"target_address"`
// 	VideoId        string `json:"video_id"`
// }

// type GeneralMessage struct {
// 	Type          string `json:"action"`
// 	SenderAddress string `json:"sender_address"`
// 	Content       string `json:"content"`
// }

type GameAction struct {
	PlayerOne        string
	PlayerTwo        string
	PlayerOneChannel chan map[string]interface{}
	PlayerTwoChannel chan map[string]interface{}
}

type playervar struct {
	address string
	conn    *websocket.Conn
}

var GameMap map[int]GameAction = make(map[int]GameAction)

func (player *playervar) readStream(uid int) {
	defer func() {
		player.conn.Close()
	}()

	var target_channel chan map[string]interface{}

	if player.address == GameMap[uid].PlayerOne {
		target_channel = GameMap[uid].PlayerTwoChannel
	} else {
		target_channel = GameMap[uid].PlayerOneChannel
	}

	for {
		var raw map[string]interface{}
		if err := player.conn.ReadJSON(&raw); err != nil {
			fmt.Println("Read failed json: ", err)
			break
		}
		target_channel <- raw
	}
}

func (player *playervar) writeStream(uid int) {
	defer func() {
		player.conn.Close()
	}()

	var target_channel chan map[string]interface{}

	if player.address == GameMap[uid].PlayerOne {
		target_channel = GameMap[uid].PlayerOneChannel
	} else {
		target_channel = GameMap[uid].PlayerTwoChannel
	}

	for action := range target_channel {
		if err := player.conn.WriteJSON(action); err != nil {
			fmt.Println(err)
			break
		}
	}
}

func GameHandler(w http.ResponseWriter, r *http.Request) {
	address := mux.Vars(r)["address"]
	uid, err := strconv.Atoi(mux.Vars(r)["uid"])
	if err != nil {
		fmt.Println(err)
		return
	}

	gameInfo, exists := GameMap[uid]
	if !exists {
		http.Error(w, "Game session Not found", http.StatusNotFound)
		return
	}

	if address != gameInfo.PlayerOne || address != gameInfo.PlayerTwo {
		http.Error(w, "Unauthorized address for game session", http.StatusNotFound)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		fmt.Println(err)
		return
	}
	player := &playervar{
		address,
		conn,
	}

	fmt.Printf("Player one: %v has joined", address)

	go player.readStream(uid)
	go player.writeStream(uid)
}
