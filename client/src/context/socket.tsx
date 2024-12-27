import {createContext,  useContext,  useState} from "react"

interface SocketVar {
	socket: WebSocket | undefined;
	getSocket: () => WebSocket| undefined;
	setSocket: (socket: WebSocket) => void;
} 


const WebSocketContext = createContext<SocketVar | undefined>(undefined)

interface WebSocketProviderProps {
	children : React.ReactNode
}

export const WebSocketContextProvider: React.FC<WebSocketProviderProps> = ({children}) => {
	const [socket, SetSocket] = useState<WebSocket | undefined>(undefined)
	function setSocket(socket: WebSocket) {
		SetSocket(socket)
	}
	function getSocket() 
	{if (socket) {
return socket
	}
	}

	return (
		<WebSocketContext.Provider value={{socket, setSocket, getSocket}}>
			{children}
	</WebSocketContext.Provider>
	)
}

export const useWebsocketContext =  () => {
	return useContext(WebSocketContext)
}
