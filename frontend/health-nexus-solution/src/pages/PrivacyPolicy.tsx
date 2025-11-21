import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6 sm:p-8">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Privacy Policy
          </h1>
          <p className="text-sm text-gray-500">
            Last Updated: November 21, 2025
          </p>
        </div>

        <div className="prose prose-sm sm:prose max-w-none space-y-6 text-gray-700">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              1. Introduction
            </h2>
            <p>
              LunaSync Health Nexus Solution ("we," "our," or "us") is committed
              to protecting your privacy and personal information. This Privacy
              Policy explains how we collect, use, disclose, and safeguard your
              information in compliance with the Data Privacy Act of 2012 (RA
              10173) and other applicable laws.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              2. Information We Collect
            </h2>
            <h3 className="text-lg font-medium text-gray-900 mt-4 mb-2">
              2.1 Personal Information
            </h3>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Full name, date of birth, and contact information</li>
              <li>Government-issued identification numbers</li>
              <li>Email address and phone number</li>
              <li>Address and demographic information</li>
            </ul>

            <h3 className="text-lg font-medium text-gray-900 mt-4 mb-2">
              2.2 Medical Information
            </h3>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Medical history and health records</li>
              <li>Prescription and medication information</li>
              <li>Laboratory results and medical documents</li>
              <li>Appointment and consultation records</li>
              <li>Insurance information</li>
            </ul>

            <h3 className="text-lg font-medium text-gray-900 mt-4 mb-2">
              2.3 Technical Information
            </h3>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>IP address and device information</li>
              <li>Browser type and version</li>
              <li>Usage data and system logs</li>
              <li>Session information</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              3. How We Use Your Information
            </h2>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>
                To schedule, manage, and confirm your medical appointments
              </li>
              <li>
                To maintain and update your medical records and health
                information
              </li>
              <li>To provide appropriate medical care and treatment</li>
              <li>
                To communicate with you regarding your appointments, test
                results, and health information
              </li>
              <li>To process payments and insurance claims</li>
              <li>To comply with legal and regulatory requirements</li>
              <li>To improve our services and system functionality</li>
              <li>To ensure the security and integrity of our systems</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              4. Information Sharing and Disclosure
            </h2>
            <p className="mb-3">
              We do not sell, trade, or rent your personal information. We may
              share your information only in the following circumstances:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>
                <strong>Healthcare Providers:</strong> With doctors, nurses, and
                other healthcare professionals involved in your care
              </li>
              <li>
                <strong>Legal Requirements:</strong> When required by law, court
                order, or government regulations
              </li>
              <li>
                <strong>Emergency Situations:</strong> To protect your vital
                interests or those of others in medical emergencies
              </li>
              <li>
                <strong>Service Providers:</strong> With trusted third-party
                service providers who assist in our operations, subject to
                confidentiality agreements
              </li>
              <li>
                <strong>With Your Consent:</strong> In other situations with
                your explicit consent
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              5. Data Security
            </h2>
            <p className="mb-3">
              We implement comprehensive security measures to protect your
              information:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Encryption of data in transit and at rest</li>
              <li>Access controls and authentication mechanisms</li>
              <li>Regular security audits and assessments</li>
              <li>Secure backup and disaster recovery procedures</li>
              <li>Staff training on data privacy and security</li>
              <li>Physical security of servers and facilities</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              6. Your Rights Under the Data Privacy Act
            </h2>
            <p className="mb-3">
              In accordance with RA 10173, you have the following rights:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>
                <strong>Right to Access:</strong> Request access to your
                personal and medical information
              </li>
              <li>
                <strong>Right to Correction:</strong> Request correction of
                inaccurate or incomplete information
              </li>
              <li>
                <strong>Right to Erasure:</strong> Request deletion of your
                information, subject to legal retention requirements
              </li>
              <li>
                <strong>Right to Object:</strong> Object to certain types of
                processing of your information
              </li>
              <li>
                <strong>Right to Data Portability:</strong> Request a copy of
                your information in a commonly used format
              </li>
              <li>
                <strong>Right to Lodge a Complaint:</strong> File a complaint
                with the National Privacy Commission
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              7. Data Retention
            </h2>
            <p>
              We retain your personal and medical information for as long as
              necessary to fulfill the purposes outlined in this policy and as
              required by applicable laws. Medical records are typically
              retained for a minimum period as mandated by Philippine healthcare
              regulations.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              8. Cookies and Tracking Technologies
            </h2>
            <p>
              We use cookies and similar technologies to enhance your
              experience, analyze usage patterns, and maintain session
              information. You can control cookie settings through your browser
              preferences.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              9. Children's Privacy
            </h2>
            <p>
              Our services are not directed to individuals under 18 years of
              age. For minors, we require parental or guardian consent for
              treatment and information processing. Parents/guardians have the
              right to access and control their children's information.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              10. Changes to This Privacy Policy
            </h2>
            <p>
              We may update this Privacy Policy periodically to reflect changes
              in our practices or legal requirements. We will notify you of
              significant changes by posting the updated policy with a new "Last
              Updated" date. Your continued use of our services after changes
              are posted constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              11. Contact Information
            </h2>
            <p>
              If you have questions about this Privacy Policy, wish to exercise
              your rights, or have privacy concerns, please contact our Data
              Protection Officer:
            </p>
            <div className="mt-3 ml-4">
              <p>
                <strong>Data Protection Officer</strong>
              </p>
              <p>LunaSync Health Nexus Solution</p>
              <p>Email: privacy@lunasync.health (example)</p>
              <p>Phone: Contact through clinic channels</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              12. National Privacy Commission
            </h2>
            <p>
              You may also file a complaint with the National Privacy Commission
              if you believe your privacy rights have been violated:
            </p>
            <div className="mt-3 ml-4">
              <p>National Privacy Commission</p>
              <p>
                5th Floor, Philippine International Convention Center (PICC)
              </p>
              <p>Vicente Sotto St., Pasay City 1307</p>
              <p>Email: info@privacy.gov.ph</p>
              <p>Website: www.privacy.gov.ph</p>
            </div>
          </section>
        </div>

        <div className="mt-8 pt-6 border-t">
          <Button
            onClick={() => navigate(-1)}
            className="bg-[#79c942] hover:bg-[#6bb33a]"
          >
            I Understand
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
