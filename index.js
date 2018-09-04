const axios = require("axios")
const config = require("./config.json")
const fs = require("fs")
const icsParse = require("node-ical")

const trelloFetch = async (route, method="GET", data={}) => {
    const request = {
        url: "https://api.trello.com/1" + route,
        method: method,
        params: {
            key: config.trello.api.key,
            token: config.trello.api.token
        },
        data: data
    }
    try {
        response = await axios.request(request)
        return response.data
    } catch(err) {
        console.err(err)
        return
    }
}

(async () => {
    const boards = await trelloFetch("/member/me/boards")
    const board = boards.find(board => (board.name == config.trello.boardName))
    const labels = await trelloFetch("/boards/" + board.id + "/labels")
    var labelMap = {}
    labels.forEach(label => labelMap[label.name] = label.id)
    const lists = await trelloFetch("/boards/" + board.id + "/lists")
    const list = lists.find(list => (list.name == config.trello.listName))

    icsParse.fromURL(config.canvasIcsUrl, {}, (err, events) => {
        if (err) console.log(err)
        const assignmentKeys = Object.keys(events).filter(
            key => key.startsWith("event-assignment")
        )
        assignmentKeys.forEach(async (key) => {
            const event = events[key]
            const summary = event.summary
            const splitIdx = summary.indexOf("[")
            const name = summary.substring(0, splitIdx)
            const course = summary.substring(splitIdx + 1, splitIdx + 9)

            await trelloFetch("/cards", "POST", {
                idList: list.id,
                name: name,
                idLabels: labelMap[course],
                desc: event.description + "\n\n" + event.url,
                due: event.end
            })
        })
    })
})()

