const express = require("express");
const blog = require("../controllers/blog.controller");

const router = express.Router();

router.get("/", blog.listPublished);
router.get("/:slug/related", blog.listRelated);
router.get("/:slug", blog.getPublishedBySlug);

module.exports = router;
