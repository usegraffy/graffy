import makeStream from './makeStream';

export default function mapStream(stream, fn) {
  return makeStream((push, end) => {
    const next = () => {
      stream
        .next()
        .then(({ value, done }) => {
          if (done) return end();
          push(fn(value));
          next();
        })
        .catch((error) => end(error));
    };
    next();
    return (error, value) => {
      error ? stream.throw(error) : stream.return(value);
    };
  });
}
