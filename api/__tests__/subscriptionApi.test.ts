import { describe, it, expect, vi, beforeEach } from "vitest";
import handleUnsubscribe from "../unsubscribe.js";
import { validateUnsubscribeToken, deleteAuthTokensForEmail } from "../_lib/services/subscription.js";

vi.mock("../_lib/services/subscription.js", () => ({
  validateUnsubscribeToken: vi.fn(),
  deleteAuthTokensForEmail: vi.fn(),
  generateUnsubscribeToken: vi.fn(),
  sendEmail: vi.fn(),
}));

vi.mock("../_lib/db.js", () => ({
  prisma: {
    userSubscription: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

function mockRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.setHeader = vi.fn();
  res.end = vi.fn();
  return res;
}

describe("Unsubscribe API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 if token missing", async () => {
    const req: any = { method: 'POST', headers: {}, body: {} };
    const res = mockRes();
    await handleUnsubscribe(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: "Missing or invalid auth token" }));
  });

  it("returns 401 if token invalid", async () => {
    const req: any = { 
        method: 'POST', 
        headers: { authorization: 'Bearer invalid' }, 
        body: {} 
    };
    const res = mockRes();
    (validateUnsubscribeToken as any).mockReturnValue(null);
    
    await handleUnsubscribe(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: "Invalid or expired unsubscribe token" }));
  });

  it("returns 400 if body ID mismatches token ID", async () => {
    const req: any = { 
        method: 'POST', 
        headers: { authorization: 'Bearer valid' }, 
        body: { subscription_id: 'other' } 
    };
    const res = mockRes();
    (validateUnsubscribeToken as any).mockReturnValue('sub-123');
    
    await handleUnsubscribe(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: "Subscription ID mismatch" }));
  });

  it("returns 200 if successful", async () => {
     const req: any = { 
        method: 'POST', 
        headers: { authorization: 'Bearer valid' }, 
        body: { subscription_id: 'sub-123' } 
    };
    const res = mockRes();
    (validateUnsubscribeToken as any).mockReturnValue('sub-123');
    
    const mod = await import("../_lib/db.js");
    vi.spyOn(mod.prisma.userSubscription, "findUnique").mockResolvedValue({
        id: 'sub-123',
        email: 'test@test.com'
    } as any);
    
    vi.spyOn(mod.prisma.userSubscription, "update").mockResolvedValue({} as any);
    
    await handleUnsubscribe(req, res);
    
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});
