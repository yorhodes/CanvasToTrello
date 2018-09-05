const axios = require("axios")
const config = require("./config.json")
const diff = require("./assignmentDiff.json")
const icsParse = require("node-ical")
const fs = require("fs")

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
        console.log("Error Encountered:")
        console.log("Request: \n" + JSON.stringify(request, null, 2))
        console.log("Error: \n" + JSON.stringify(err, null, 2))
        return
    }
}

(async () => {
    // fetch target board from user
    const boards = await trelloFetch("/member/me/boards")
    const board = boards.find(board => (board.name == config.trello.boardName))

    if (typeof board === "undefined") {
        console.log("Target board: " + config.trello.boardName + " was not found")
        return
    }


    // fetch target list from board
    const lists = await trelloFetch("/boards/" + board.id + "/lists")
    const list = lists.find(list => (list.name == config.trello.listName))

    if (typeof list === "undefined") {
        console.log("Target list: " + config.trello.listName + " was not found")
        return
    }

    // fetch labels form board
    const labels = await trelloFetch("/boards/" + board.id + "/labels")

    // map labels from name to id
    var labelMap = {}
    labels.forEach(label => labelMap[label.name] = label.id)

    // parse canvas calendar
    icsParse.fromURL(config.canvasIcsUrl, {}, (err, events) => {
        if (err) console.log(err)

        // filter events on assignment type and unparsed
        const assignmentKeys = Object.keys(events).filter(key => 
            key.startsWith("event-assignment") &&
            !diff.keys.includes(key)
        )

        // update parsed
        diff.keys = diff.keys.concat(assignmentKeys)
        fs.writeFile("assignmentDiff.json", JSON.stringify(diff, null, 2))

        // iterate over assignments from calendar
        assignmentKeys.forEach(async (key) => {
            const event = events[key]
            const summary = event.summary
            const splitIdx = summary.indexOf("[")
            const name = summary.substring(0, splitIdx)
            const course = summary.substring(splitIdx + 1, splitIdx + 9)

            if (!course in labelMap) {
                console.log("No label exists called: " + course)
                return
            }

            // create card
            await trelloFetch("/cards", "POST", {
                idList: list.id,
                name: name,
                idLabels: labelMap[course],
                desc: event.desc,
                due: event.end
            })
        })
    })
})()

