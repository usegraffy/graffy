import Repeater from '@repeaterjs/repeater';

/*
  A *Bookmark* is a data structure that records the last state of a reader, so that it may resume from there.
*/

export default ({ table, bookmarkPath = '/watches' }) => (store) => {
  store.onRead(onRead);

  pollQuery = [];
  const readers = Set();

  const onRead = (query) =>
    new Repeater(async (push, end) => {
      const { bookmarkId } = query.opts;
      let bookmark = bookmarkId && loadBookmark(bookmarkId);

      if (!bookmark) {
        const initial = getInitial(query);
        bookmark = createBookmark(query, initial);
        saveBookmark(bookmarkId, bookmark);
        push(initial);
      }

      const reader = (update) => {
        const newBookmark = updateBookmark(bookmark, update);
        if (newBookmark) {
          subtract(pollQuery, bookmark);
          add(pollQuery, newBookmark);
          saveBookmark(bookmarkId, bookmark);
          bookmark = newBookmark;
        }
      };

      add(pollQuery, bookmark);
      readers.add(reader);

      await end;
      subtract(pollQuery, bookmark);
      readers.delete(reader);
    });
};
