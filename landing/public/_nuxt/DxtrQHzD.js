function Sleep(delay = 0) {
  return new Promise(function (resolve) {
    setTimeout(resolve, delay);
  })
}

export { Sleep as S };
