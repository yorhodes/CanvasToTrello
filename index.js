const axios = require("axios")
const config = require("./config.json")
const icsParse = require("node-ical")

const trelloFetch = async (route, method="GET", data={}) => {
    const request = {
        url: "https://api.trello.com/1" + route,
        method: method,
        // authenticate trello API
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
    // fetch target board from user
    const boards = await trelloFetch("/member/me/boards")
    const board = boards.find(board => (board.name == config.trello.boardName))

    // fetch target list from board
    const lists = await trelloFetch("/boards/" + board.id + "/lists")
    const list = lists.find(list => (list.name == config.trello.listName))

    // fetch labels form board
    const labels = await trelloFetch("/boards/" + board.id + "/labels")

    // map labels from name to id
    var labelMap = {}
    labels.forEach(label => labelMap[label.name] = label.id)

    // parse canvas calendar
    icsParse.fromURL(config.canvasIcsUrl, {}, (err, events) => {
        if (err) console.log(err)
        const assignmentKeys = Object.keys(events).filter(
            key => key.startsWith("event-assignment")
        )
        // iterate over assignments from calendar
        assignmentKeys.forEach(async (key) => {
            const event = events[key]
            const summary = event.summary
            const splitIdx = summary.indexOf("[")
            const name = summary.substring(0, splitIdx)
            const course = summary.substring(splitIdx + 1, splitIdx + 9)

            if (!course in labelMap) {
                // create label for course
                const resp = await trelloFetch("/labels", "POST", {
                    name: course,
                    color: "yellow",
                    idBoard: board.id
                }) 
                labelMap[course] = resp.id
            }

            // create card
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

