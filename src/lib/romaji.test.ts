import { describe, expect, it } from "vitest";
import { romaji } from "./romaji";

describe("romaji", () => {
  it("romanises on'yomi in katakana and kun'yomi in hiragana", () => {
    expect(romaji("スイ")).toBe("sui");
    expect(romaji("みず")).toBe("mizu");
  });

  it("shows okurigana in brackets", () => {
    expect(romaji("た.べる")).toBe("ta(beru)");
  });

  it("keeps affix marks", () => {
    expect(romaji("-び")).toBe("-bi");
    expect(romaji("ひと-")).toBe("hito-");
  });

  it("handles small kana, long vowels, and ん before a vowel", () => {
    expect(romaji("がっこう")).toBe("gakkou");
    expect(romaji("きょう")).toBe("kyou");
    expect(romaji("ジャ")).toBe("ja");
    expect(romaji("ラーメン")).toBe("raamen");
    expect(romaji("ほんや")).toBe("hon'ya");
  });

  it("passes through text that isn't kana", () => {
    expect(romaji("abc")).toBe("abc");
  });
});
