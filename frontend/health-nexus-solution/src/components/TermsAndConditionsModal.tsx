import { X } from "lucide-react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader } from "./ui/dialog";

interface TermsAndConditionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TermsAndConditionsModal = ({
  isOpen,
  onClose,
}: TermsAndConditionsModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        <div className="sticky top-0 bg-white z-10 border-b px-6 py-4">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  Terms and Conditions
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
                Welcome to LunaSync Health Nexus Solution. These Terms and
                Conditions govern your use of our healthcare management system
                and appointment booking services. By accessing or using our
                services, you agree to be bound by these terms.
              </p>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">
                2. Acceptance of Terms
              </h2>
              <p className="text-sm sm:text-base">
                By creating an account, booking an appointment, or using any of
                our services, you acknowledge that you have read, understood,
                and agree to be bound by these Terms and Conditions, as well as
                our Privacy Policy.
              </p>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">
                3. User Responsibilities
              </h2>
              <ul className="list-disc list-inside space-y-2 ml-4 text-sm sm:text-base">
                <li>
                  You are responsible for maintaining the confidentiality of
                  your account credentials
                </li>
                <li>
                  You must provide accurate, current, and complete information
                  during registration and appointment booking
                </li>
                <li>
                  You agree to notify us immediately of any unauthorized use of
                  your account
                </li>
                <li>
                  You are responsible for all activities that occur under your
                  account
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">
                4. Appointment Booking and Cancellation
              </h2>
              <ul className="list-disc list-inside space-y-2 ml-4 text-sm sm:text-base">
                <li>
                  Appointments are subject to availability and confirmation by
                  our staff
                </li>
                <li>
                  We reserve the right to reschedule or cancel appointments due
                  to unforeseen circumstances
                </li>
                <li>
                  Patients should arrive on time for scheduled appointments
                </li>
                <li>
                  Repeated no-shows may result in restrictions on future
                  appointment bookings
                </li>
                <li>
                  Cancellations should be made at least 24 hours in advance when
                  possible
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">
                5. Medical Information and Records
              </h2>
              <ul className="list-disc list-inside space-y-2 ml-4 text-sm sm:text-base">
                <li>
                  All medical information provided will be handled in accordance
                  with applicable healthcare privacy laws
                </li>
                <li>
                  You have the right to access, correct, and request deletion of
                  your personal medical records
                </li>
                <li>
                  Medical records are maintained for the period required by law
                </li>
                <li>
                  Your medical information may be shared with healthcare
                  providers involved in your care
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">
                6. Data Privacy and Security
              </h2>
              <p className="text-sm sm:text-base">
                We comply with the Data Privacy Act of 2012 (RA 10173) and
                implement appropriate technical and organizational measures to
                protect your personal information. For detailed information
                about how we collect, use, and protect your data, please refer
                to our Privacy Policy.
              </p>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">
                7. Use of Services
              </h2>
              <ul className="list-disc list-inside space-y-2 ml-4 text-sm sm:text-base">
                <li>Our services are intended for lawful purposes only</li>
                <li>
                  You agree not to misuse or attempt to gain unauthorized access
                  to our systems
                </li>
                <li>
                  You will not use our services to transmit harmful, offensive,
                  or illegal content
                </li>
                <li>
                  We reserve the right to suspend or terminate accounts that
                  violate these terms
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">
                8. Limitation of Liability
              </h2>
              <p className="text-sm sm:text-base">
                While we strive to provide accurate and reliable services, we
                cannot guarantee uninterrupted or error-free operation. We are
                not liable for any indirect, incidental, or consequential
                damages arising from your use of our services.
              </p>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">
                9. Medical Disclaimer
              </h2>
              <p className="text-sm sm:text-base">
                Our platform facilitates appointment booking and healthcare
                management but does not provide medical advice, diagnosis, or
                treatment. Always seek the advice of qualified healthcare
                professionals regarding any medical questions or conditions.
              </p>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">
                10. Changes to Terms
              </h2>
              <p className="text-sm sm:text-base">
                We reserve the right to modify these Terms and Conditions at any
                time. Changes will be effective immediately upon posting. Your
                continued use of our services after changes are posted
                constitutes acceptance of the modified terms.
              </p>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">
                11. Governing Law
              </h2>
              <p className="text-sm sm:text-base">
                These Terms and Conditions are governed by and construed in
                accordance with the laws of the Republic of the Philippines. Any
                disputes arising from these terms shall be subject to the
                exclusive jurisdiction of Philippine courts.
              </p>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">
                12. Contact Information
              </h2>
              <p className="text-sm sm:text-base">
                If you have any questions about these Terms and Conditions,
                please contact us through the clinic's official contact
                channels.
              </p>
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

export default TermsAndConditionsModal;
