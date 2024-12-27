package main

import (
	"fmt"
	"net/http"

	"github.com/gorilla/mux"
)

const PORT string = ":8000"

var Uid chan int

// TODO: reusable uid
func GetUid() int {
	var id int = <-Uid
	Uid <- id + 1
	return id
}

func main() {
	Uid = make(chan int, 1)
	Uid <- 1000
	r := mux.NewRouter()
	r.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) { w.Write([]byte("Welcome Friend!")) })

	r.HandleFunc("/join/{address}", JoinQueue)
	r.HandleFunc("/game/{address}/{uid}", GameHandler)

	err := http.ListenAndServe(PORT, r)
	if err != nil {
		fmt.Println("error starting the server: ", err)
	}
}
