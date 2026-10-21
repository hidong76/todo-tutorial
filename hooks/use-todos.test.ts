import { act, renderHook, waitFor } from "@testing-library/react";
import { useTodos } from "@/hooks/use-todos";

beforeEach(() => {
  localStorage.clear();
});

describe("useTodos 우선순위", () => {
  it("addTodo에 전달한 우선순위로 추가한다", () => {
    const { result } = renderHook(() => useTodos());

    act(() => {
      result.current.addTodo("장보기", "high");
    });

    expect(result.current.todos[0]).toMatchObject({
      text: "장보기",
      priority: "high",
      completed: false,
    });
  });

  it("우선순위를 생략하면 기본값(medium)으로 추가한다", () => {
    const { result } = renderHook(() => useTodos());

    act(() => {
      result.current.addTodo("청소");
    });

    expect(result.current.todos[0].priority).toBe("medium");
  });

  it("priority가 없는 기존 저장 데이터는 medium으로 보정해 로드한다", async () => {
    localStorage.setItem(
      "todos",
      JSON.stringify([{ id: "1", text: "구버전 할 일", completed: false }])
    );

    const { result } = renderHook(() => useTodos());

    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.todos).toHaveLength(1);
    expect(result.current.todos[0].priority).toBe("medium");
  });

  it("추가한 우선순위를 localStorage에 저장한다", async () => {
    const { result } = renderHook(() => useTodos());

    act(() => {
      result.current.addTodo("장보기", "low");
    });

    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem("todos") ?? "[]");
      expect(stored[0]?.priority).toBe("low");
    });
  });
});

describe("useTodos 마감일", () => {
  it("addTodo에 전달한 마감일로 추가한다", () => {
    const { result } = renderHook(() => useTodos());

    act(() => {
      result.current.addTodo("회의", "medium", "2026-07-01");
    });

    expect(result.current.todos[0]).toMatchObject({
      text: "회의",
      dueDate: "2026-07-01",
    });
  });

  it("마감일을 생략하면 dueDate 없이 추가한다", () => {
    const { result } = renderHook(() => useTodos());

    act(() => {
      result.current.addTodo("청소");
    });

    expect(result.current.todos[0].dueDate).toBeUndefined();
  });

  it("새로 추가한 Todo에는 생성 시각(createdAt)이 기록된다", () => {
    const { result } = renderHook(() => useTodos());

    act(() => {
      result.current.addTodo("회의");
    });

    expect(typeof result.current.todos[0].createdAt).toBe("number");
  });

  it("createdAt이 없는 기존 데이터는 number로 보정해 로드한다", async () => {
    localStorage.setItem(
      "todos",
      JSON.stringify([
        { id: "1", text: "구버전 할 일", completed: false, priority: "medium" },
      ])
    );

    const { result } = renderHook(() => useTodos());

    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(typeof result.current.todos[0].createdAt).toBe("number");
  });
});

describe("useTodos 카테고리", () => {
  it("addTodo에 전달한 카테고리로 추가한다", () => {
    const { result } = renderHook(() => useTodos());

    act(() => {
      result.current.addTodo("보고서", "medium", undefined, "work");
    });

    expect(result.current.todos[0].category).toBe("work");
  });

  it("카테고리를 생략하면 category 없이 추가한다", () => {
    const { result } = renderHook(() => useTodos());

    act(() => {
      result.current.addTodo("청소");
    });

    expect(result.current.todos[0].category).toBeUndefined();
  });
});

describe("useTodos 편집", () => {
  async function setupWithTwoTodos() {
    const hook = renderHook(() => useTodos());
    await waitFor(() => expect(hook.result.current.loaded).toBe(true));

    act(() => {
      hook.result.current.addTodo("첫 번째");
    });
    act(() => {
      hook.result.current.addTodo("두 번째");
    });

    // addTodo는 맨 앞에 추가하므로 [두 번째, 첫 번째] 순서
    const [target, other] = hook.result.current.todos;
    return { ...hook, target, other };
  }

  it("앞뒤 공백을 제거한 텍스트로 수정한다", async () => {
    const { result, target } = await setupWithTwoTodos();

    act(() => {
      result.current.editTodo(target.id, "  새 제목  ");
    });

    expect(result.current.todos[0]).toEqual({ ...target, text: "새 제목" });
  });

  it("수정 대상이 아닌 항목은 그대로 유지한다", async () => {
    const { result, other } = await setupWithTwoTodos();
    const targetId = result.current.todos[0].id;

    act(() => {
      result.current.editTodo(targetId, "새 제목");
    });

    expect(result.current.todos[1]).toBe(other);
  });

  it("수정한 텍스트를 localStorage에 저장한다", async () => {
    const { result, target } = await setupWithTwoTodos();

    act(() => {
      result.current.editTodo(target.id, "새 제목");
    });

    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem("todos") ?? "[]");
      expect(stored[0]?.text).toBe("새 제목");
    });
  });

  it.each([
    ["빈 문자열", ""],
    ["공백만", "   "],
  ])("%s로 수정하면 해당 항목만 삭제한다", async (_, text) => {
    const { result, target, other } = await setupWithTwoTodos();

    act(() => {
      result.current.editTodo(target.id, text);
    });

    expect(result.current.todos).toEqual([other]);
  });

  it("존재하지 않는 id로 수정하면 목록이 변하지 않는다", async () => {
    const { result } = await setupWithTwoTodos();
    const before = result.current.todos;

    act(() => {
      result.current.editTodo("없는-id", "새 제목");
    });

    expect(result.current.todos).toEqual(before);
  });
});

describe("useTodos 손상 데이터 보호", () => {
  it("파싱할 수 없는 저장값을 빈 배열로 덮어쓰지 않는다", async () => {
    localStorage.setItem("todos", "{이건 JSON이 아님");

    const { result } = renderHook(() => useTodos());

    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.todos).toEqual([]);
    // 손상된 원본이 보존돼 복구 여지가 남아야 한다
    expect(localStorage.getItem("todos")).toBe("{이건 JSON이 아님");
  });

  it("배열이 아닌 저장값도 덮어쓰지 않는다", async () => {
    localStorage.setItem("todos", JSON.stringify({ x: 1 }));

    const { result } = renderHook(() => useTodos());

    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.todos).toEqual([]);
    expect(localStorage.getItem("todos")).toBe('{"x":1}');
  });

  it("손상 데이터 로드 후 새 항목을 추가하면 정상적으로 저장된다", async () => {
    localStorage.setItem("todos", "{이건 JSON이 아님");

    const { result } = renderHook(() => useTodos());
    await waitFor(() => expect(result.current.loaded).toBe(true));

    act(() => {
      result.current.addTodo("새 할 일");
    });

    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem("todos") ?? "null");
      expect(Array.isArray(stored)).toBe(true);
      expect(stored[0]?.text).toBe("새 할 일");
    });
  });
});

describe("useTodos 추가", () => {
  it.each([
    ["빈 문자열", ""],
    ["공백만", "   "],
  ])("%s은 추가하지 않는다", (_, text) => {
    const { result } = renderHook(() => useTodos());

    act(() => {
      result.current.addTodo(text);
    });

    expect(result.current.todos).toEqual([]);
  });

  it("앞뒤 공백을 제거한 텍스트로 추가한다", () => {
    const { result } = renderHook(() => useTodos());

    act(() => {
      result.current.addTodo("  장보기  ");
    });

    expect(result.current.todos[0].text).toBe("장보기");
  });

  it("마감일이 빈 문자열이면 dueDate를 undefined로 정규화한다", () => {
    const { result } = renderHook(() => useTodos());

    act(() => {
      result.current.addTodo("회의", "medium", "");
    });

    expect(result.current.todos[0].dueDate).toBeUndefined();
  });

  it("새 항목을 목록 맨 앞에 추가한다", () => {
    const { result } = renderHook(() => useTodos());

    act(() => {
      result.current.addTodo("첫 번째");
    });
    act(() => {
      result.current.addTodo("두 번째");
    });

    expect(result.current.todos.map((todo) => todo.text)).toEqual([
      "두 번째",
      "첫 번째",
    ]);
  });

  it("추가한 항목마다 서로 다른 id를 부여한다", () => {
    const { result } = renderHook(() => useTodos());

    act(() => {
      result.current.addTodo("첫 번째");
      result.current.addTodo("두 번째");
      result.current.addTodo("세 번째");
    });

    const ids = result.current.todos.map((todo) => todo.id);
    expect(new Set(ids).size).toBe(3);
  });
});

describe("useTodos 토글/삭제", () => {
  async function setupWithTwoTodos() {
    const hook = renderHook(() => useTodos());
    await waitFor(() => expect(hook.result.current.loaded).toBe(true));

    act(() => {
      hook.result.current.addTodo("첫 번째");
    });
    act(() => {
      hook.result.current.addTodo("두 번째");
    });

    // addTodo는 맨 앞에 추가하므로 [두 번째, 첫 번째] 순서
    const [target, other] = hook.result.current.todos;
    return { ...hook, target, other };
  }

  it("toggleTodo는 대상의 completed만 반전한다", async () => {
    const { result, target, other } = await setupWithTwoTodos();

    act(() => {
      result.current.toggleTodo(target.id);
    });

    expect(result.current.todos[0]).toEqual({ ...target, completed: true });
    expect(result.current.todos[1]).toBe(other);
  });

  it("두 번 토글하면 원래 상태로 돌아온다", async () => {
    const { result, target } = await setupWithTwoTodos();

    act(() => {
      result.current.toggleTodo(target.id);
    });
    act(() => {
      result.current.toggleTodo(target.id);
    });

    expect(result.current.todos[0]).toEqual(target);
  });

  it("존재하지 않는 id로 토글하면 목록이 변하지 않는다", async () => {
    const { result } = await setupWithTwoTodos();
    const before = result.current.todos;

    act(() => {
      result.current.toggleTodo("없는-id");
    });

    expect(result.current.todos).toEqual(before);
  });

  it("deleteTodo는 대상만 제거한다", async () => {
    const { result, target, other } = await setupWithTwoTodos();

    act(() => {
      result.current.deleteTodo(target.id);
    });

    expect(result.current.todos).toEqual([other]);
  });

  it("존재하지 않는 id로 삭제하면 목록이 변하지 않는다", async () => {
    const { result } = await setupWithTwoTodos();
    const before = result.current.todos;

    act(() => {
      result.current.deleteTodo("없는-id");
    });

    expect(result.current.todos).toEqual(before);
  });

  it("토글 결과를 localStorage에 저장한다", async () => {
    const { result, target } = await setupWithTwoTodos();

    act(() => {
      result.current.toggleTodo(target.id);
    });

    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem("todos") ?? "[]");
      expect(stored[0]?.completed).toBe(true);
    });
  });

  it("삭제 결과를 localStorage에 저장한다", async () => {
    const { result, other } = await setupWithTwoTodos();

    act(() => {
      result.current.deleteTodo(result.current.todos[0].id);
    });

    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem("todos") ?? "[]");
      expect(stored).toEqual([other]);
    });
  });
});

describe("useTodos 로드/저장", () => {
  it("저장된 데이터를 그대로 복원한다", async () => {
    const saved = [
      {
        id: "1",
        text: "저장된 할 일",
        completed: true,
        priority: "high",
        createdAt: 100,
        dueDate: "2026-07-01",
        category: "work",
      },
    ];
    localStorage.setItem("todos", JSON.stringify(saved));

    const { result } = renderHook(() => useTodos());

    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.todos).toEqual(saved);
  });

  it("초기 마운트 시 빈 배열로 기존 데이터를 덮어쓰지 않는다", async () => {
    const saved = JSON.stringify([
      { id: "1", text: "기존", completed: false, priority: "low", createdAt: 1 },
    ]);
    localStorage.setItem("todos", saved);

    const { result } = renderHook(() => useTodos());

    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(JSON.parse(localStorage.getItem("todos") ?? "[]")).toEqual(
      JSON.parse(saved)
    );
  });

  it("저장값이 빈 배열이면 빈 목록으로 로드한다", async () => {
    localStorage.setItem("todos", "[]");

    const { result } = renderHook(() => useTodos());

    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.todos).toEqual([]);
  });

  it("createdAt이 없는 여러 항목은 앞쪽일수록 큰 값으로 보정한다", async () => {
    localStorage.setItem(
      "todos",
      JSON.stringify([
        { id: "1", text: "가장 최신", completed: false },
        { id: "2", text: "중간", completed: false },
        { id: "3", text: "가장 오래됨", completed: false },
      ])
    );

    const { result } = renderHook(() => useTodos());

    await waitFor(() => expect(result.current.loaded).toBe(true));
    const [a, b, c] = result.current.todos.map((todo) => todo.createdAt);
    expect(a).toBeGreaterThan(b);
    expect(b).toBeGreaterThan(c);
  });

  it("보정 과정에서 기존 필드를 보존한다", async () => {
    localStorage.setItem(
      "todos",
      JSON.stringify([
        {
          id: "1",
          text: "구버전 할 일",
          completed: true,
          dueDate: "2026-07-01",
          category: "personal",
        },
      ])
    );

    const { result } = renderHook(() => useTodos());

    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.todos[0]).toMatchObject({
      id: "1",
      text: "구버전 할 일",
      completed: true,
      dueDate: "2026-07-01",
      category: "personal",
    });
  });
});
