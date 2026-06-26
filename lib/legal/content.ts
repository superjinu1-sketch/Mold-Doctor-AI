export const PRIVACY_UPDATED = '[시행일: 진우 입력]';
export const TERMS_UPDATED = '[시행일: 진우 입력]';

export const PRIVACY_MD = `# 개인정보처리방침

Mold Doctor AI(이하 "회사")는 개인정보 보호법 등 관계 법령을 준수하며, 이용자의 개인정보를 다음과 같이 처리합니다.

## 1. 수집하는 개인정보 항목
- 이메일 회원가입: 이메일 주소, 비밀번호(암호화 저장)
- Google 로그인: 이메일 주소, Google 계정 식별자, 인증 제공자 정보
- 서비스 이용 중 입력: 불량 사진·금형 도면, 사출 셋팅값, 수지·금형·제품 정보, 진단 결과·해결 메모, 후속 질문
- 자동 생성: 회원 고유 ID, 크레딧 잔액·거래내역, 인프라 서버 로그(접속 IP·요청정보 일시 기록)
- 회사는 광고·분석 트래킹 도구를 사용하지 않습니다.

## 2. 수집·이용 목적
회원 식별·로그인, AI 진단 제공 및 이력 저장, 크레딧·결제 관리, 부정이용 방지·이용한도 관리, 문의 대응, 서비스 개선.

## 3. 보유 및 이용 기간
- 회원정보·진단기록: 회원 탈퇴 시까지(탈퇴 시 지체 없이 파기)
- 불량 사진·도면 원본: 저장하지 않음(진단 처리 후 미보관, 진단기록엔 썸네일만 저장)
- 법령상 보존: 계약·청약철회 기록 5년, 대금결제·재화공급 기록 5년, 소비자 분쟁처리 기록 3년, 접속 로그 3개월

## 4. 제3자 제공
회사는 목적 범위를 넘어 개인정보를 제공하지 않습니다. 법령에 근거가 있거나 적법한 수사 요청이 있는 경우만 예외로 합니다.

## 5. 처리 위탁 및 국외 이전
회사는 개인정보 보호법 제28조의8 제1항 제3호(계약 이행을 위한 처리위탁·보관)에 따라 본 방침 공개로 국외 이전 사항을 알립니다.
- Anthropic, PBC (미국): 불량/도면 이미지·셋팅값 등 텍스트·후속질문 전송, AI 진단 분석 목적, 처리 즉시 응답 후 회사 미보관
- Supabase, Inc. (미국 등): 회원 인증정보·진단기록·크레딧 내역, 데이터베이스 호스팅 목적, 회원 탈퇴/위탁 종료 시까지
- Vercel, Inc. (미국): 접속 IP·요청정보, 애플리케이션 호스팅 목적, 단기 보관
이전 거부: 회원 탈퇴 또는 서비스 미이용으로 거부 가능하나, 핵심 진단 기능을 이용할 수 없습니다.

## 6. 정보주체의 권리
이용자는 열람·정정·삭제·처리정지를 요구할 수 있습니다.
- 열람: 앱 내 계정 페이지
- 계정·데이터 삭제: 앱 내 [계정 > 계정 삭제]에서 직접 실행(즉시 파기)
- 기타 문의: contact@molddoctor.ai

## 7. 파기 절차 및 방법
보유 기간 경과·목적 달성 시 지체 없이 파기합니다. 전자 파일은 복구 불가능한 방법으로 영구 삭제하며, 계정 삭제 시 연결된 모든 데이터가 연쇄 삭제됩니다.

## 8. 안전성 확보 조치
전송구간 암호화(HTTPS/TLS), 접근 권한 분리·최소화, 인증정보 암호화 저장.

## 9. 만 14세 미만 아동
서비스는 만 14세 미만을 대상으로 하지 않으며 해당 아동의 개인정보를 수집하지 않습니다.

## 10. 개인정보 보호책임자
- 보호책임자: [진우 입력: 성명/직책]
- 연락처: contact@molddoctor.ai
- 침해 신고: 개인정보침해신고센터(118), 개인정보분쟁조정위원회(1833-6972)

## 11. 방침의 변경
본 방침은 [시행일: 진우 입력]부터 적용되며, 변경 시 시행 7일 전(중대 변경 30일 전) 공지합니다.

사업자 정보: [진우 입력 — 상호·대표자·사업자등록번호·주소]`;

export const TERMS_MD = `# 이용약관

## 1. 목적
본 약관은 Mold Doctor AI(이하 "회사")가 제공하는 사출 성형 불량 진단 AI 서비스의 이용 조건과 회사·이용자의 권리·의무를 정합니다.

## 2. 정의
- 서비스: 불량 사진·셋팅값 등을 바탕으로 AI가 원인 분석·권장 셋팅·체크리스트를 제공하는 서비스
- 크레딧: 유료 기능 이용에 사용되는 서비스 내 사용권

## 3. 약관의 효력 및 변경
약관은 서비스 화면 게시로 효력이 발생하며, 변경 시 시행 7일 전(불리한 변경은 30일 전) 공지합니다.

## 4. 서비스의 성격 및 면책
- 진단 결과는 AI가 생성한 참고용 대처 가이드이며 불량 해결을 보장하지 않습니다.
- AI는 오류·부정확한 결과를 낼 수 있고, 결과 채택과 실제 설비 조정의 최종 판단·책임은 현장 엔지니어(이용자)에게 있습니다.
- 회사는 진단 결과 적용으로 인한 생산 손실·설비 손상 등 손해에 대해 책임지지 않습니다(회사의 고의·중과실 제외).
- 서비스는 전문가의 현장 진단을 대체하지 않습니다.

## 5. 회원가입 및 계정
이메일 또는 Google 계정으로 가입하며, 이용자는 계정 정보를 직접 관리할 책임이 있습니다. 만 14세 미만은 가입할 수 없습니다.

## 6. 크레딧 및 결제 [진우 결정: 결제방식·가격 확정 후 보정]
- 유료 기능은 크레딧 차감(원칙: 1회 진단=1크레딧). 후속 질문은 세션당 정해진 횟수 내 무료.
- 가입 시 무료 크레딧이 지급될 수 있습니다.
- 결제는 앱 마켓 또는 회사가 지정한 결제대행사를 통해 처리됩니다.
- 구독 상품은 월 사용 한도(캡)가 있으며 무제한 이용은 제공하지 않습니다.

## 7. 청약철회 및 환불
- 전자상거래법에 따라 결제일로부터 7일 이내 청약철회가 가능합니다.
- 이미 사용된 크레딧은 청약철회가 제한될 수 있으며, 미사용 크레딧은 환불 가능합니다.
- 앱 마켓(IAP) 결제 환불은 해당 마켓 정책을 따릅니다.
- 구체적 환불 기준은 [진우 결정] 후 명시합니다.

## 8. 이용자의 의무
계정 도용, 비정상적·자동화 대량 호출, 위법 콘텐츠 업로드, 무단 상업적 재판매를 금지합니다.

## 9. 콘텐츠의 권리
이용자가 업로드한 콘텐츠의 권리는 이용자에게 있으며, 회사는 진단 제공·이력 저장·서비스 개선을 위해 이를 처리합니다(개인정보처리방침에 따름).

## 10. 서비스의 중단·변경
점검·기술적 사유·천재지변 시 서비스를 변경·중단할 수 있으며 사전 또는 사후 공지합니다.

## 11. 계정 해지
이용자는 앱 내 [계정 > 계정 삭제]로 언제든 탈퇴할 수 있고, 탈퇴 시 데이터가 파기됩니다. 회사는 약관·법령 위반 시 이용을 제한할 수 있습니다.

## 12. 책임의 한계
회사는 진단 결과의 정확성·완전성을 보증하지 않으며, 손해배상 책임은 관계 법령이 허용하는 범위로 제한됩니다.

## 13. 준거법 및 관할
본 약관은 대한민국 법령에 따르며, 분쟁은 회사 본점 소재지 관할 법원을 관할로 합니다.

본 약관은 [시행일: 진우 입력]부터 시행합니다. 사업자 정보: [진우 입력].`;

// ─── 영어판(편의 번역, 준거 원문은 한국어). placeholder는 KO와 동기로 채울 것. ───
export const PRIVACY_MD_EN = `# Privacy Policy

This is an English translation provided for convenience. The Korean version is the official and governing document.

Mold Doctor AI ("the Company") complies with the Personal Information Protection Act (PIPA) and other applicable laws, and processes users' personal information as follows.

## 1. Personal Information We Collect
- Email sign-up: email address, password (stored encrypted)
- Google sign-in: email address, Google account identifier, authentication provider information
- Entered during service use: defect photos and mold drawings, injection settings, resin/mold/product information, diagnosis results and resolution notes, follow-up questions
- Automatically generated: member unique ID, credit balance and transaction history, infrastructure server logs (access IP and request information recorded temporarily)
- The Company does not use advertising or analytics tracking tools.

## 2. Purpose of Collection and Use
Member identification and login, providing AI diagnosis and storing history, credit and payment management, abuse prevention and usage-limit control, responding to inquiries, and service improvement.

## 3. Retention and Use Period
- Member information and diagnosis records: until account withdrawal (destroyed without delay upon withdrawal)
- Original defect photos and drawings: not stored (not retained after diagnosis processing; only thumbnails are kept in diagnosis records)
- Statutory retention: contract and subscription-withdrawal records 5 years, payment and goods-supply records 5 years, consumer dispute-handling records 3 years, access logs 3 months

## 4. Provision to Third Parties
The Company does not provide personal information beyond the stated purposes. Exceptions apply only where there is a legal basis or a lawful investigative request.

## 5. Outsourcing of Processing and Overseas Transfer
Pursuant to Article 28-8(1)3 of the Personal Information Protection Act (outsourcing/storage for performance of a contract), the Company discloses overseas transfers through this policy.
- Anthropic, PBC (USA): defect/drawing images, settings and other text, and follow-up questions are transmitted for the purpose of AI diagnosis analysis; not retained by the Company after an immediate response
- Supabase, Inc. (USA, etc.): member authentication information, diagnosis records, credit history, for the purpose of database hosting; until account withdrawal or termination of outsourcing
- Vercel, Inc. (USA): access IP and request information, for the purpose of application hosting; short-term retention
Refusal of transfer: you may refuse by withdrawing your account or not using the service; however, core diagnosis functions will be unavailable.

## 6. Rights of the Data Subject
Users may request access, correction, deletion, and suspension of processing.
- Access: in-app account page
- Account/data deletion: performed directly in-app via [Account > Delete Account] (immediate destruction)
- Other inquiries: contact@molddoctor.ai

## 7. Destruction Procedure and Method
Upon expiry of the retention period or achievement of the purpose, information is destroyed without delay. Electronic files are permanently deleted by irrecoverable means, and when an account is deleted, all linked data is deleted in cascade.

## 8. Security Measures
Encryption in transit (HTTPS/TLS), separation and minimization of access privileges, encrypted storage of authentication information.

## 9. Children Under 14
The service is not directed to children under the age of 14 and does not collect their personal information.

## 10. Personal Information Protection Officer
- Protection Officer: [TBD: name/title]
- Contact: contact@molddoctor.ai
- Report infringement: Personal Information Infringement Report Center (118), Personal Information Dispute Mediation Committee (1833-6972)

## 11. Changes to This Policy
This policy applies from [Effective date: TBD]. Changes will be announced 7 days before they take effect (30 days for material changes).

Business information: [TBD - business name, representative, business registration number, address]`;

export const TERMS_MD_EN = `# Terms of Service

This is an English translation provided for convenience. The Korean version is the official and governing document.

## 1. Purpose
These Terms set out the conditions of use of the injection molding defect diagnosis AI service provided by Mold Doctor AI ("the Company"), and the rights and obligations of the Company and users.

## 2. Definitions
- Service: a service in which AI provides cause analysis, recommended settings, and checklists based on defect photos, settings, and similar inputs
- Credit: an in-service right of use consumed to use paid features

## 3. Effect and Amendment of Terms
These Terms take effect upon posting on the service screen. Changes will be announced 7 days before they take effect (30 days for changes unfavorable to users).

## 4. Nature of the Service and Disclaimer
- Diagnosis results are AI-generated reference guidance and do not guarantee resolution of defects.
- AI may produce errors or inaccurate results; the final judgment and responsibility for adopting results and making actual equipment adjustments rest with the on-site engineer (the user).
- The Company is not liable for damages such as production loss or equipment damage arising from applying diagnosis results (except for the Company's intent or gross negligence).
- The service does not replace on-site diagnosis by an expert.

## 5. Membership and Account
You sign up with an email or Google account, and you are responsible for managing your own account information. Persons under the age of 14 may not sign up.

## 6. Credits and Payment [TBD: to be revised after payment method and pricing are finalized]
- Paid features deduct credits (principle: 1 diagnosis = 1 credit). Follow-up questions are free within a set number per session.
- Free credits may be granted upon sign-up.
- Payment is processed through the app marketplace or a payment provider designated by the Company.
- Subscription products have a monthly usage cap and do not provide unlimited use.

## 7. Withdrawal of Subscription and Refunds
- Under the Act on Consumer Protection in Electronic Commerce, withdrawal is possible within 7 days from the date of payment.
- Withdrawal may be restricted for already-used credits; unused credits are refundable.
- Refunds for app marketplace (IAP) payments follow the respective marketplace policy.
- Specific refund criteria will be specified after [TBD].

## 8. User Obligations
Account theft, abnormal or automated bulk calls, uploading unlawful content, and unauthorized commercial resale are prohibited.

## 9. Rights to Content
Rights to content uploaded by users belong to the users; the Company processes it to provide diagnosis, store history, and improve the service (in accordance with the Privacy Policy).

## 10. Suspension and Change of Service
The Company may change or suspend the service for maintenance, technical reasons, or force majeure, with notice given before or after.

## 11. Termination of Account
Users may withdraw at any time via [Account > Delete Account] in the app, and data is destroyed upon withdrawal. The Company may restrict use in the event of a violation of these Terms or applicable laws.

## 12. Limitation of Liability
The Company does not warrant the accuracy or completeness of diagnosis results, and liability for damages is limited to the extent permitted by applicable law.

## 13. Governing Law and Jurisdiction
These Terms are governed by the laws of the Republic of Korea, and disputes shall be subject to the jurisdiction of the court having jurisdiction over the location of the Company's head office.

These Terms take effect from [Effective date: TBD]. Business information: [TBD].`;
