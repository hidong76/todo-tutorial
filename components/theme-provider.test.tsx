import { fireEvent, render, screen } from "@testing-library/react";
import { ThemeProvider } from "@/components/theme-provider";

// next-themes는 시스템 테마 감지에 matchMedia를 사용하지만 jsdom에는 없다.
beforeEach(() => {
  localStorage.clear();
  document.documentElement.className = "";
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderProvider() {
  return render(
    <ThemeProvider defaultTheme="light">
      <input aria-label="입력" />
      <textarea aria-label="메모" />
      <div contentEditable aria-label="편집 영역" />
    </ThemeProvider>
  );
}

function isDark() {
  return document.documentElement.classList.contains("dark");
}

describe("ThemeProvider 'd' 단축키", () => {
  it("'d' 키를 누르면 다크/라이트 테마를 전환한다", () => {
    renderProvider();
    expect(isDark()).toBe(false);

    fireEvent.keyDown(window, { key: "d" });
    expect(isDark()).toBe(true);

    fireEvent.keyDown(window, { key: "d" });
    expect(isDark()).toBe(false);
  });

  it("대문자 'D'도 테마를 전환한다", () => {
    renderProvider();

    fireEvent.keyDown(window, { key: "D" });

    expect(isDark()).toBe(true);
  });

  it.each([
    ["input", "입력"],
    ["textarea", "메모"],
  ])("%s에서 입력 중이면 전환하지 않는다", (_, label) => {
    renderProvider();

    fireEvent.keyDown(screen.getByLabelText(label), { key: "d" });

    expect(isDark()).toBe(false);
  });

  it("contentEditable 요소에서 입력 중이면 전환하지 않는다", () => {
    renderProvider();
    const editable = screen.getByLabelText("편집 영역");
    // jsdom은 isContentEditable을 구현하지 않는다
    Object.defineProperty(editable, "isContentEditable", { value: true });

    fireEvent.keyDown(editable, { key: "d" });

    expect(isDark()).toBe(false);
  });

  it.each([
    ["Ctrl", { ctrlKey: true }],
    ["Meta", { metaKey: true }],
    ["Alt", { altKey: true }],
  ])("%s 조합 키는 무시한다", (_, modifier) => {
    renderProvider();

    fireEvent.keyDown(window, { key: "d", ...modifier });

    expect(isDark()).toBe(false);
  });

  it("키를 누르고 있어 반복 입력(repeat)되면 무시한다", () => {
    renderProvider();

    fireEvent.keyDown(window, { key: "d", repeat: true });

    expect(isDark()).toBe(false);
  });

  it("이미 처리된(defaultPrevented) 이벤트는 무시한다", () => {
    renderProvider();
    const event = new KeyboardEvent("keydown", { key: "d", cancelable: true });
    event.preventDefault();

    fireEvent(window, event);

    expect(isDark()).toBe(false);
  });

  it("'d'가 아닌 키는 무시한다", () => {
    renderProvider();

    fireEvent.keyDown(window, { key: "f" });

    expect(isDark()).toBe(false);
  });

  it("언마운트하면 keydown 리스너를 제거한다", () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = renderProvider();

    unmount();

    expect(removeSpy).toHaveBeenCalledWith("keydown", expect.any(Function));
    removeSpy.mockRestore();
  });
});
