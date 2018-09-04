const axios = require("axios")
const config = require("./config.json")
const fs = require("fs")
const icsParse = require("node-ical")

const trelloFetch = async (route, data={}) => {
    const request = {
        url: "https://api.trello.com/1" + route,
        params: {
            key: config.trello.api.key,
            token: config.trello.api.token
        },
        data: data
    }
    const response = await axios.request(request)
    return response.data
}

(async () => {
    const boards = await trelloFetch("/member/me/boards")
    const board = boards.find(board => (board.name == config.trello.boardName))
    const lists = await trelloFetch("/boards/" + board.id + "/lists")
    const list = lists.find(list => (list.name == config.trello.listName))

    icsParse.fromURL(config.canvasIcsUrl, {}, (err, data) => {
        if (err) console.log(err)
        console.log(data)
    })
    // await trelloFetch("/cards", {
    //     idList: list.id
    // })
})()

