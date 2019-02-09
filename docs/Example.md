Example
=======

Let's build an API for a simple blog; the data model may look like this:

![Example data model](example-model.png)

Every Grue data model is a tree with a single root node, denoted by `/`. First-level children are typically nodes representing the main resources of our application, `/posts` and `/users`.

### Resources

Under them are individual resource entities, with their unique IDs as keys. Therefore `/posts/123` is the canonical path for the post with ID 123.

Resource entities typically have several fields, some of which (like `/posts/:id/author` above) may be _links_ to other places in the tree.

### Indexes

To fetch resources using parameters other than their ID, we use indexes like `/postsByTime`. Here, "ByTime" indicates that posts are ordered by the "time" field within this index.

First level children under this index have filtering parameters as keys. Here, posts may be filtered by tags, so there are children `tags:[]` (containing posts with no tags), `tags:[tag1]` (posts with one tag, _tag1_), `tags[tag1,tag2]` (posts with both _tag1_ and _tag2_), etc.

Under the filtering parameters are nodes linking to the posts at their canonical locations (like `/posts/:id`). The keys of these links are values of the ordering field (time).
