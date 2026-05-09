const allowedImageExtensions = new Set(["webp", "jpg", "png"]);
const invalidPathSegmentPattern = /[\\/]|(?:^|[\\/])\.\.(?:[\\/]|$)|\.\./;

type TripImagePathInput = {
  userId: string;
  tripId: string;
  imageId: string;
  extension?: "webp" | "jpg" | "png";
};

export function buildTripImagePath({
  userId,
  tripId,
  imageId,
  extension = "webp",
}: TripImagePathInput) {
  assertSafePathSegment(userId, "userId");
  assertSafePathSegment(tripId, "tripId");
  assertSafePathSegment(imageId, "imageId");

  if (!allowedImageExtensions.has(extension)) {
    throw new Error("图片扩展名仅支持 webp、jpg、png。");
  }

  return `${userId}/${tripId}/${imageId}.${extension}`;
}

function assertSafePathSegment(value: string, fieldName: string) {
  if (!value.trim()) {
    throw new Error(`${fieldName} 不能为空。`);
  }

  if (invalidPathSegmentPattern.test(value)) {
    throw new Error(`${fieldName} 不能包含路径分隔符或路径穿越片段。`);
  }
}
