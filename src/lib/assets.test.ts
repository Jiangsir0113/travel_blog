import { describe, expect, it } from "vitest";

import { buildTripImagePath } from "./assets";

describe("buildTripImagePath", () => {
  it("uses webp by default", () => {
    expect(
      buildTripImagePath({
        userId: "user-1",
        tripId: "trip-1",
        imageId: "cover",
      }),
    ).toBe("user-1/trip-1/cover.webp");
  });

  it("supports jpg and png extensions", () => {
    expect(
      buildTripImagePath({
        userId: "user-1",
        tripId: "trip-1",
        imageId: "cover",
        extension: "jpg",
      }),
    ).toBe("user-1/trip-1/cover.jpg");

    expect(
      buildTripImagePath({
        userId: "user-1",
        tripId: "trip-1",
        imageId: "map",
        extension: "png",
      }),
    ).toBe("user-1/trip-1/map.png");
  });

  it("rejects unsupported extensions", () => {
    expect(() =>
      buildTripImagePath({
        userId: "user-1",
        tripId: "trip-1",
        imageId: "cover",
        extension: "gif" as "webp",
      }),
    ).toThrow("图片扩展名仅支持 webp、jpg、png。");
  });

  it("rejects empty path segments", () => {
    expect(() =>
      buildTripImagePath({
        userId: "",
        tripId: "trip-1",
        imageId: "cover",
      }),
    ).toThrow("userId 不能为空。");
  });

  it("rejects separators and traversal fragments in path segments", () => {
    expect(() =>
      buildTripImagePath({
        userId: "user/1",
        tripId: "trip-1",
        imageId: "cover",
      }),
    ).toThrow("userId 不能包含路径分隔符或路径穿越片段。");

    expect(() =>
      buildTripImagePath({
        userId: "user-1",
        tripId: "..",
        imageId: "cover",
      }),
    ).toThrow("tripId 不能包含路径分隔符或路径穿越片段。");

    expect(() =>
      buildTripImagePath({
        userId: "user-1",
        tripId: "trip-1",
        imageId: "cover\\main",
      }),
    ).toThrow("imageId 不能包含路径分隔符或路径穿越片段。");
  });
});
