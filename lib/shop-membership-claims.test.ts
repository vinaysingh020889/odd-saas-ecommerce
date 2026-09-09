import { describe, expect, it } from "vitest";
import { selectShopClaimBenefit } from "@/lib/shop-membership";

const base = { tenantId:"tenant", planId:"plan", title:"Complimentary Prasad", description:null, type:"FREE_USAGE", scope:"SHOP", method:"CLAIM", valueDecimal:null, maxDiscountAmount:null, valueText:null, usageLimit:1, usagePeriod:"MONTHLY", active:true, validFrom:null, validUntil:null, customerVisible:true, stackWithCoupon:false, stackWithAutomatic:false, stackWithWallet:true, residualChargePolicy:"CUSTOMER_PAYS", fulfilmentInstructions:"Dispatch sealed dry prasad.", internalNote:null, sortOrder:0, createdAt:new Date(), updatedAt:new Date() } as const;
const target=(targetType:string,targetId:string)=>({id:`${targetType}:${targetId}`,tenantId:"tenant",benefitId:"benefit",targetType,targetId,labelSnapshot:null,createdAt:new Date()});
const benefit=(targetType:string,targetId:string)=>({...base,id:"benefit",targets:[target(targetType,targetId)]}) as never;
const context={productId:"product",variantId:"variant",categoryId:"prasad",tagIds:["kashi"]};
describe("Shop complimentary claims",()=>{
  it.each([["CATEGORY","prasad"],["PRODUCT","product"],["VARIANT","variant"],["TAG","kashi"]])("matches %s targets",(type,id)=>expect(selectShopClaimBenefit([benefit(type,id)],context,"benefit")?.id).toBe("benefit"));
  it("rejects another temple and automatic benefits",()=>{expect(selectShopClaimBenefit([benefit("TAG","ujjain")],context,"benefit")).toBeNull();const automatic = benefit("TAG","kashi") as unknown as Record<string, unknown>; expect(selectShopClaimBenefit([{...automatic,method:"AUTOMATIC"}] as never,context,"benefit")).toBeNull();});
});
