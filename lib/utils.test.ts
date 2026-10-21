import { cn } from "@/lib/utils";

describe("cn", () => {
  it("조건부 클래스를 합치고 falsy 값은 제외한다", () => {
    expect(cn("a", false && "b", undefined, null, "c")).toBe("a c");
  });

  it("충돌하는 Tailwind 클래스는 뒤에 온 값으로 병합한다", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
  });
});
