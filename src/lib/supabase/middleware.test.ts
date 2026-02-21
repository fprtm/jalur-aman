/**
 * updateSession Middleware Tests
 *
 * Purpose:
 * Ensures that the middleware:
 * 1. Creates a Supabase server client correctly
 * 2. Refreshes the user session via getUser()
 * 3. Reads cookies from request
 * 4. Properly sets refreshed cookies on both request and response
 *
 * This test avoids calling real Supabase and Next.js internals
 * by using mocks for deterministic and isolated behavior.
 */

import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateSession } from "@/lib/supabase/middleware";

// Mock Supabase client factory
vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(),
}));

// Mock NextResponse to intercept cookie setting
vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return {
    ...actual,
    NextResponse: {
      next: vi.fn().mockImplementation(() => ({
        cookies: {
          set: vi.fn(),
        },
      })),
    },
  };
});

describe("updateSession middleware", () => {
  let mockRequest: NextRequest;
  let mockSupabase: any;
  let mockGetUser: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock environment variables
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.com");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "mock-anon-key");

    // Arrange: mock request object
    mockRequest = {
      headers: new Headers(),
      cookies: {
        getAll: vi.fn().mockReturnValue([]),
        set: vi.fn(),
      },
    } as unknown as NextRequest;

    // Arrange: mock Supabase client
    mockGetUser = vi.fn();
    mockSupabase = {
      auth: {
        getUser: mockGetUser,
      },
    };

    (createServerClient as any).mockReturnValue(mockSupabase);
  });

  it("should initialize Supabase client and refresh session", async () => {
    // Act
    await updateSession(mockRequest);

    // Assert: client created properly
    expect(createServerClient).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({
        cookies: expect.objectContaining({
          getAll: expect.any(Function),
          setAll: expect.any(Function),
        }),
      }),
    );

    // Assert: session refresh triggered
    expect(mockGetUser).toHaveBeenCalled();

    // Assert: request cookies accessed
    const clientOptions = (createServerClient as any).mock.calls[0][2];
    clientOptions.cookies.getAll();
    expect(mockRequest.cookies.getAll).toHaveBeenCalled();
  });

  it("should correctly update cookies when Supabase refreshes session", async () => {
    // Arrange: simulate Supabase refreshing token
    (createServerClient as any).mockImplementation(
      (_url: string, _key: string, options: any) => {
        options.cookies.setAll([
          { name: "sb-token", value: "new-token", options: {} },
        ]);
        return mockSupabase;
      },
    );

    // Act
    const response = await updateSession(mockRequest);

    // Assert: request cookies updated
    expect(mockRequest.cookies.set).toHaveBeenCalledWith(
      "sb-token",
      "new-token",
    );

    // Assert: response cookies updated
    expect(response.cookies.set).toHaveBeenCalledWith(
      "sb-token",
      "new-token",
      expect.anything(),
    );
  });
});
