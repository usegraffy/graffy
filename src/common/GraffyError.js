function fit(strings, ...values) {
  let message = '';
  const props = {};

  /* The part before the first ':' is the error name. */
  const nameEndPos = strings[0].indexOf(':');
  if (nameEndPos > 0) {
    props.name = strings[0].substr(0, nameEndPos);
    message = strings[0].substr(nameEndPos + 1).trimStart();
  } else {
    message = strings[0];
  }

  /* A final plain object with no text after it should have
     its properties copied to the error object. */
  let skipLast = false;
  const lastValue = values[values.length - 1];
  if (
    strings[strings.length - 1].trim() === '' &&
    lastValue &&
    typeof lastValue === 'object' &&
    !Array.isArray(lastValue) &&
    !(lastValue instanceof Date) &&
    !(lastValue instanceof Error)
  ) {
    Object.assign(props, lastValue);
    skipLast = true;
  }

  for (let i = 0; i < values.length - (skipLast ? 1 : 0); i++) {
    const value = values[i];

    if (typeof value !== 'object' || !value) {
      message += value;
    } else if (value instanceof Error) {
      if (!props.cause) props.cause = value;
      if (i < values.length - 1) {
        message += '(' + value.name + ': ' + value.message + ')';
      }
    } else {
      try {
        message += JSON.stringify(value);
      } catch (_) {
        message += value;
      }
    }

    message += strings[i + 1];
  }

  const err = new Error(message);
  Object.assign(err, props);
  if (Error.captureStackTrace) Error.captureStackTrace(err, fit);
  return err;
}

function t() {
  const x = 43;
  const y = new Error('yerror');
  const extra = {
    foo: 22,
    bar: { x: 53 },
  };
  throw fit`CannotDoSomething: foo threw ${y} when called with ${x}${extra}`;
}

t();
