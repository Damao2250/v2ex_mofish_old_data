const fs = require("fs")
const ejs = require("ejs")
const moment = require("moment")
const { generateImg } = require("./v2ex-tools.js")

// 运行action前在此处先手动更新帖子的id
const dataIds = [
  "1112101",
  "1112104",
  "1111754",
  "803669",
  "1022439",
  "1112220",
  "1111684",
  "1111723",
  "1111995",
  "1111487",
]

let data = {
  v2ex_posts: [],
  date: "",
}

async function v2ex_post() {
  let day = moment().utcOffset(8).format("YYYY-MM-DD-HHmmss")
  let ids = dataIds
  console.time("start")
  let promises = ids.map((id) => fetch_posts(day, id))
  let data = {}
  for (let promise of promises) {
    let res = await promise
    data = res
  }
  console.log("for循环promise，done")
  console.timeEnd("start")
  return data
}

async function fetch_posts(day, id) {
  const fetch_opts = {
    timeout: 10 * 1000, // 10s
  }
  let body = await fetch(
    `https://www.v2ex.com/api/topics/show.json?id=${id}`,
    fetch_opts
  )
  let res = await body.json()
  res.forEach((item) => {
    item.createdTimeFormat = moment(item.created * 1000).format(
      "YYYY-MM-DD HH:mm:ss"
    )
  })
  let PostsData = await createPostsImg(res, day)
  data.date = day + "-by-ids" // 当前日期
  data.v2ex_posts = data.v2ex_posts.concat(PostsData)
  return data
}

async function createPostsImg(posts, day) {
  try {
    console.time("start")
    let promises = posts.map((item) => generateImg(item, day))
    let i = 0
    for (let promise of promises) {
      let res = await promise
      posts[i].imageUrl = res.realPath
      let sortedData =
        (res.allReplies &&
          res.allReplies.sort((a, b) => b.thankCount - a.thankCount)) ||
        []
      sortedData = sortedData.slice(0, 10)
      posts[i].allReplies = sortedData
      i++
    }
    console.timeEnd("start")
    return posts
  } catch (error) {
    console.error("生成失败:", error)
  }
}

async function renderFile() {
  if (!data.v2ex_posts.length) {
    console.error("暂无数据，稍后再试")
    return
  }
  // 渲染模板
  ejs.renderFile(`${__dirname}/../public/issue.ejs`, data, {}, (err, str) => {
    if (err) {
      console.error("渲染模板出错:", err)
      return
    }
    ejs.renderFile(`${__dirname}/../public/issue.ejs`, data, {}, (err, str) => {
      if (err) {
        console.error("渲染模板出错:", err)
        return
      }
      // 将渲染结果写入github-issue.md文件
      fs.writeFileSync(`github-issue.md`, str, "utf8")
      console.log("GitHub Issue 已生成：github-issue.md")
      return
    })
  })
}

async function startRun() {
  try {
    await v2ex_post()
    await renderFile()
    console.log("结束")
    return "doen!"
  } catch (e) {
    console.log(e)
  }
}

if (require.main === module) {
  ;(async function () {
    await startRun()
  })()
}
