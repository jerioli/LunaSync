import { X } from "lucide-react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader } from "./ui/dialog";

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PrivacyPolicyModal = ({ isOpen, onClose }: PrivacyPolicyModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        <div className="sticky top-0 bg-white z-10 border-b px-6 py-4">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  Privacy Policy
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  Last Updated: November 21, 2025
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
        </div>

        <div className="px-6 py-4">
          <div className="prose prose-sm sm:prose max-w-none space-y-6 text-gray-700">
            <section>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">
                1. Introduction
              </h2>
              <p className="text-sm sm:text-base">
                LunaSync ("we," "our," or "us") is committed to protecting your
                privacy and personal information. This Privacy Policy explains
                how we collect, use, disclose, and safeguard your information in
                compliance with the Data Privacy Act of 2012 (RA 10173) and
                other applicable laws.
              </p>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">
                2. Information We Collect
              </h2>
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mt-4 mb-2">
                2.1 Personal Information
              </h3>
              <ul className="list-disc list-inside space-y-2 ml-4 text-sm sm:text-base">
                <li>Full name, date of birth, and contact information</li>
                <li>Government-issued identification numbers</li>
                <li>Email address and phone number</li>
                <li>Address and demographic information</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">
                3. How We Use Your Information
              </h2>
              <ul className="list-disc list-inside space-y-2 ml-4 text-sm sm:text-base">
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
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">
                4. Information Sharing and Disclosure
              </h2>
              <p className="mb-3 text-sm sm:text-base">
                We do not sell, trade, or rent your personal information. We may
                share your information only in the following circumstances:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 text-sm sm:text-base">
                <li>
                  <strong>Healthcare Providers:</strong> With doctors, nurses,
                  and other healthcare professionals involved in your care
                </li>
                <li>
                  <strong>Legal Requirements:</strong> When required by law,
                  court order, or government regulations
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
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">
                5. Data Security
              </h2>
              <p className="mb-3 text-sm sm:text-base">
                We implement comprehensive security measures to protect your
                information:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 text-sm sm:text-base">
                <li>Encryption of data in transit and at rest</li>
                <li>Access controls and authentication mechanisms</li>
                <li>Regular security audits and assessments</li>
                <li>Secure backup and disaster recovery procedures</li>
                <li>Staff training on data privacy and security</li>
                <li>Physical security of servers and facilities</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">
                6. Your Rights Under the Data Privacy Act
              </h2>
              <p className="mb-3 text-sm sm:text-base">
                In accordance with RA 10173, you have the following rights:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 text-sm sm:text-base">
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
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">
                7. Data Retention
              </h2>
              <p className="text-sm sm:text-base">
                We retain your personal and medical information for as long as
                necessary to fulfill the purposes outlined in this policy and as
                required by applicable laws. Medical records are typically
                retained for a minimum period as mandated by Philippine
                healthcare regulations.
              </p>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">
                8. Cookies and Tracking Technologies
              </h2>
              <p className="text-sm sm:text-base">
                We use cookies and similar technologies to enhance your
                experience, analyze usage patterns, and maintain session
                information. You can control cookie settings through your
                browser preferences.
              </p>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">
                9. Children's Privacy
              </h2>
              <p className="text-sm sm:text-base">
                Our services are not directed to individuals under 18 years of
                age. For minors, we require parental or guardian consent for
                treatment and information processing. Parents/guardians have the
                right to access and control their children's information.
              </p>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">
                10. Changes to This Privacy Policy
              </h2>
              <p className="text-sm sm:text-base">
                We may update this Privacy Policy periodically to reflect
                changes in our practices or legal requirements. We will notify
                you of significant changes by posting the updated policy with a
                new "Last Updated" date. Your continued use of our services
                after changes are posted constitutes acceptance of the updated
                policy.
              </p>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">
                11. Contact Information
              </h2>
              <p className="text-sm sm:text-base">
                If you have questions about this Privacy Policy, wish to
                exercise your rights, or have privacy concerns, please contact
                our Data Protection Officer:
              </p>
              <div className="mt-3 ml-4 text-sm sm:text-base">
                <p>
                  <strong>Data Protection Officer</strong>
                </p>
                <p>LunaSync Health Nexus Solution</p>
                <p>Email: privacy@lunasync.health (example)</p>
                <p>Phone: Contact through clinic channels</p>
              </div>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">
                12. National Privacy Commission
              </h2>
              <p className="text-sm sm:text-base">
                You may also file a complaint with the National Privacy
                Commission if you believe your privacy rights have been
                violated:
              </p>
              <div className="mt-3 ml-4 text-sm sm:text-base">
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
        </div>

        <div className="sticky bottom-0 bg-white border-t px-6 py-4">
          <Button
            onClick={onClose}
            className="w-full sm:w-auto bg-[#79c942] hover:bg-[#6bb33a]"
          >
            I Understand
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PrivacyPolicyModal;
