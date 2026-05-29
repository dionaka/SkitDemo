/**
 * 优先浏览器历史返回；无历史时跳转 fallback
 */
export function smartBack(router, fallbackPath = '/') {
  const state = router.options.history.state;
  if (state?.back) {
    router.back();
  } else {
    router.push(fallbackPath);
  }
}
