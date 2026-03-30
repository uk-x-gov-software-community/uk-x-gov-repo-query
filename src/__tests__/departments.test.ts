import { describe, expect, it } from "vitest";
import { ORG_TO_DEPARTMENT, resolveDepartment } from "../data/departments.js";

describe("resolveDepartment", () => {
  it("maps alphagov to Government Digital Service", () => {
    expect(resolveDepartment("alphagov")).toBe("Government Digital Service");
  });

  it("maps UKHomeOffice to Home Office", () => {
    expect(resolveDepartment("UKHomeOffice")).toBe("Home Office");
  });

  it("maps HMRC to HM Revenue and Customs", () => {
    expect(resolveDepartment("HMRC")).toBe("HM Revenue and Customs");
  });

  it("maps moj-analytical-services to Ministry of Justice", () => {
    expect(resolveDepartment("moj-analytical-services")).toBe("Ministry of Justice");
  });

  it("maps co-cddo to Central Digital and Data Office", () => {
    expect(resolveDepartment("co-cddo")).toBe("Central Digital and Data Office");
  });

  it("returns null for an unknown org", () => {
    expect(resolveDepartment("some-random-org")).toBeNull();
  });

  it("is case-sensitive — does not match wrong casing", () => {
    expect(resolveDepartment("ALPHAGOV")).toBeNull();
  });

  it("maps both casing variants of the same org independently", () => {
    expect(resolveDepartment("HMRC")).toBe("HM Revenue and Customs");
    expect(resolveDepartment("hmrc")).toBe("HM Revenue and Customs");
  });
});

describe("ORG_TO_DEPARTMENT", () => {
  it("exports a non-empty mapping object", () => {
    expect(Object.keys(ORG_TO_DEPARTMENT).length).toBeGreaterThan(0);
  });

  it("all values are non-empty strings", () => {
    for (const value of Object.values(ORG_TO_DEPARTMENT)) {
      expect(typeof value).toBe("string");
      expect(value.length).toBeGreaterThan(0);
    }
  });
});
