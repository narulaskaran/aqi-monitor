import { renderHook, act } from "@testing-library/react";
import { vi } from "vitest";
import { useCodeInput } from "./useCodeInput";

describe("useCodeInput", () => {
  it("should be defined", () => {
    expect(useCodeInput).toBeDefined();
  });

  it("should initialize with empty code array", () => {
    const { result } = renderHook(() => useCodeInput(6));
    expect(result.current.code).toEqual(["", "", "", "", "", ""]);
  });

  it("should update code when handleChange is called", () => {
    const { result } = renderHook(() => useCodeInput(6));
    
    act(() => {
      const mockEvent = {
        target: { value: "123" },
      } as React.ChangeEvent<HTMLInputElement>;
      result.current.handleChange(mockEvent);
    });

    expect(result.current.code).toEqual(["1", "2", "3", "", "", ""]);
  });

  it("should limit input to specified length", () => {
    const { result } = renderHook(() => useCodeInput(6));
    
    act(() => {
      const mockEvent = {
        target: { value: "1234567890" },
      } as React.ChangeEvent<HTMLInputElement>;
      result.current.handleChange(mockEvent);
    });

    expect(result.current.code).toEqual(["1", "2", "3", "4", "5", "6"]);
  });

  it("should filter out non-digit characters", () => {
    const { result } = renderHook(() => useCodeInput(6));
    
    act(() => {
      const mockEvent = {
        target: { value: "12a3b4c" },
      } as React.ChangeEvent<HTMLInputElement>;
      result.current.handleChange(mockEvent);
    });

    expect(result.current.code).toEqual(["1", "2", "3", "4", "", ""]);
  });

  it("should call onComplete when code is fully entered", () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() => useCodeInput(6, onComplete));
    
    act(() => {
      const mockEvent = {
        target: { value: "123456" },
      } as React.ChangeEvent<HTMLInputElement>;
      result.current.handleChange(mockEvent);
    });

    expect(onComplete).toHaveBeenCalledWith(["1", "2", "3", "4", "5", "6"]);
  });

  it("should handle paste events", () => {
    const { result } = renderHook(() => useCodeInput(6));
    
    act(() => {
      const mockEvent = {
        preventDefault: vi.fn(),
        clipboardData: {
          getData: () => "123456",
        },
      } as unknown as React.ClipboardEvent<HTMLInputElement>;
      result.current.handlePaste(mockEvent);
    });

    expect(result.current.code).toEqual(["1", "2", "3", "4", "5", "6"]);
  });

  it("should extract digits from pasted text with non-digits", () => {
    const { result } = renderHook(() => useCodeInput(6));
    
    act(() => {
      const mockEvent = {
        preventDefault: vi.fn(),
        clipboardData: {
          getData: () => "12-34-56",
        },
      } as unknown as React.ClipboardEvent<HTMLInputElement>;
      result.current.handlePaste(mockEvent);
    });

    expect(result.current.code).toEqual(["1", "2", "3", "4", "5", "6"]);
  });

  it("should set code using setCode wrapper", () => {
    const { result } = renderHook(() => useCodeInput(6));
    
    act(() => {
      result.current.setCode(["1", "2", "3", "4", "5", "6"]);
    });

    expect(result.current.code).toEqual(["1", "2", "3", "4", "5", "6"]);
  });

  it("should provide inputRef", () => {
    const { result } = renderHook(() => useCodeInput(6));
    expect(result.current.inputRef).toBeDefined();
    expect(result.current.inputRef.current).toBeNull();
  });
});
