import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Todo } from "@/lib/types";
import { TodoItem } from "@/components/todo-item";

function makeTodo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: "1",
    text: "테스트 할 일",
    completed: false,
    priority: "medium",
    createdAt: 0,
    ...overrides,
  };
}

describe("TodoItem", () => {
  it("할 일 텍스트를 렌더링한다", () => {
    render(
      <TodoItem
        todo={makeTodo()}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
      />
    );

    expect(screen.getByText("테스트 할 일")).toBeInTheDocument();
  });

  it("체크박스를 클릭하면 해당 id로 onToggle을 호출한다", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(
      <TodoItem
        todo={makeTodo({ id: "abc" })}
        onToggle={onToggle}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
      />
    );

    await user.click(screen.getByRole("checkbox"));

    expect(onToggle).toHaveBeenCalledExactlyOnceWith("abc");
  });

  it("삭제 버튼을 클릭하면 해당 id로 onDelete를 호출한다", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(
      <TodoItem
        todo={makeTodo({ id: "abc" })}
        onToggle={vi.fn()}
        onDelete={onDelete}
        onEdit={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: "삭제" }));

    expect(onDelete).toHaveBeenCalledExactlyOnceWith("abc");
  });

  it("우선순위 라벨을 뱃지로 표시한다", () => {
    render(
      <TodoItem
        todo={makeTodo({ priority: "high" })}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
      />
    );

    expect(screen.getByText("높음")).toBeInTheDocument();
  });

  it("완료된 할 일은 취소선 스타일을 가진다", () => {
    render(
      <TodoItem
        todo={makeTodo({ completed: true })}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
      />
    );

    expect(screen.getByText("테스트 할 일")).toHaveClass("line-through");
  });

  it("마감일이 있으면 마감일을 표시한다", () => {
    render(
      <TodoItem
        todo={makeTodo({ dueDate: "2026-07-01" })}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
      />
    );

    expect(screen.getByText("2026-07-01")).toBeInTheDocument();
  });

  it("마감일이 없으면 마감일을 표시하지 않는다", () => {
    render(
      <TodoItem
        todo={makeTodo()}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
      />
    );

    expect(screen.queryByText("2026-07-01")).not.toBeInTheDocument();
  });

  it("카테고리가 있으면 태그를 표시한다", () => {
    render(
      <TodoItem
        todo={makeTodo({ category: "work" })}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
      />
    );

    expect(screen.getByText("업무")).toBeInTheDocument();
  });

  it("카테고리가 없으면 태그를 표시하지 않는다", () => {
    render(
      <TodoItem
        todo={makeTodo()}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
      />
    );

    expect(screen.queryByText("업무")).not.toBeInTheDocument();
    expect(screen.queryByText("개인")).not.toBeInTheDocument();
    expect(screen.queryByText("쇼핑")).not.toBeInTheDocument();
  });
});

describe("TodoItem 편집 - IME 조합 중 Enter", () => {
  it("IME 조합 확정용 Enter(isComposing=true)는 편집을 커밋하지 않는다", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(
      <TodoItem
        todo={makeTodo()}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onEdit={onEdit}
      />
    );

    await user.dblClick(screen.getByText("테스트 할 일"));
    const input = screen.getByRole("textbox", { name: "할 일 편집" });
    fireEvent.change(input, { target: { value: "수정중" } });

    // 한글 마지막 글자 조합을 확정하려고 누른 Enter (isComposing=true)
    fireEvent.keyDown(input, { key: "Enter", isComposing: true });

    expect(onEdit).not.toHaveBeenCalled();
    // 여전히 편집 모드여야 한다
    expect(
      screen.getByRole("textbox", { name: "할 일 편집" })
    ).toBeInTheDocument();
  });

  it("조합이 끝난 일반 Enter는 정상적으로 커밋한다", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(
      <TodoItem
        todo={makeTodo()}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onEdit={onEdit}
      />
    );

    await user.dblClick(screen.getByText("테스트 할 일"));
    const input = screen.getByRole("textbox", { name: "할 일 편집" });
    fireEvent.change(input, { target: { value: "수정완료" } });

    fireEvent.keyDown(input, { key: "Enter" });

    expect(onEdit).toHaveBeenCalledExactlyOnceWith("1", "수정완료");
  });
});

describe("TodoItem 편집 - 키보드/blur", () => {
  function renderItem(onEdit = vi.fn()) {
    render(
      <>
        <TodoItem
          todo={makeTodo()}
          onToggle={vi.fn()}
          onDelete={vi.fn()}
          onEdit={onEdit}
        />
        <button type="button">바깥</button>
      </>
    );
    return { onEdit };
  }

  it("더블클릭하면 기존 텍스트가 채워진 입력창에 포커스된다", async () => {
    const user = userEvent.setup();
    renderItem();

    await user.dblClick(screen.getByText("테스트 할 일"));

    const input = screen.getByRole("textbox", { name: "할 일 편집" });
    expect(input).toHaveValue("테스트 할 일");
    expect(input).toHaveFocus();
  });

  it("Escape를 누르면 onEdit 없이 취소하고 원래 텍스트를 표시한다", async () => {
    const user = userEvent.setup();
    const { onEdit } = renderItem();

    await user.dblClick(screen.getByText("테스트 할 일"));
    const input = screen.getByRole("textbox", { name: "할 일 편집" });
    await user.clear(input);
    await user.type(input, "수정중");
    await user.keyboard("{Escape}");

    expect(onEdit).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("textbox", { name: "할 일 편집" })
    ).not.toBeInTheDocument();
    expect(screen.getByText("테스트 할 일")).toBeInTheDocument();
  });

  it("편집 중 다른 곳을 클릭해 blur하면 onEdit을 호출한다", async () => {
    const user = userEvent.setup();
    const { onEdit } = renderItem();

    await user.dblClick(screen.getByText("테스트 할 일"));
    const input = screen.getByRole("textbox", { name: "할 일 편집" });
    await user.clear(input);
    await user.type(input, "바뀐 텍스트");
    await user.click(screen.getByRole("button", { name: "바깥" }));

    expect(onEdit).toHaveBeenCalledExactlyOnceWith("1", "바뀐 텍스트");
    expect(
      screen.queryByRole("textbox", { name: "할 일 편집" })
    ).not.toBeInTheDocument();
  });

  it("Escape로 취소한 뒤 다시 편집하면 원본 텍스트로 시작한다", async () => {
    const user = userEvent.setup();
    renderItem();

    await user.dblClick(screen.getByText("테스트 할 일"));
    const input = screen.getByRole("textbox", { name: "할 일 편집" });
    await user.clear(input);
    await user.type(input, "버릴 내용");
    await user.keyboard("{Escape}");

    await user.dblClick(screen.getByText("테스트 할 일"));

    expect(screen.getByRole("textbox", { name: "할 일 편집" })).toHaveValue(
      "테스트 할 일"
    );
  });

  it("빈 문자열로 커밋하면 빈 문자열 그대로 onEdit에 전달한다", async () => {
    const user = userEvent.setup();
    const { onEdit } = renderItem();

    await user.dblClick(screen.getByText("테스트 할 일"));
    await user.clear(screen.getByRole("textbox", { name: "할 일 편집" }));
    await user.keyboard("{Enter}");

    // 빈 문자열을 삭제로 처리하는 것은 useTodos.editTodo의 책임이다
    expect(onEdit).toHaveBeenCalledExactlyOnceWith("1", "");
  });

  it("Enter로 커밋하면 편집 모드를 종료한다", async () => {
    const user = userEvent.setup();
    const { onEdit } = renderItem();

    await user.dblClick(screen.getByText("테스트 할 일"));
    await user.keyboard("{Enter}");

    expect(onEdit).toHaveBeenCalledExactlyOnceWith("1", "테스트 할 일");
    expect(
      screen.queryByRole("textbox", { name: "할 일 편집" })
    ).not.toBeInTheDocument();
  });
});

describe("TodoItem 우선순위 뱃지 폴백", () => {
  it("알 수 없는 우선순위 값이면 기본 우선순위(보통) 뱃지를 표시한다", () => {
    render(
      <TodoItem
        todo={makeTodo({ priority: "urgent" as Todo["priority"] })}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
      />
    );

    expect(screen.getByText("보통")).toBeInTheDocument();
  });
});
