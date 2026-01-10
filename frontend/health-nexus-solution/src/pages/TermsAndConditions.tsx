import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";

const TermsAndConditions = () => {
  const navigate = useNavigate();

  const handleClose = () => {
    // If opened in a new window/tab, close it
    if (window.opener) {
      window.close();
    } else {
      // Otherwise, navigate back
      navigate(-1);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6 sm:p-8">
        <div className="mb-6">
          <Button variant="ghost" onClick={handleClose} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Terms and Conditions
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
              Welcome to LunaSync Health Nexus Solution. These Terms and
              Conditions govern your use of our healthcare management system and
              appointment booking services. By accessing or using our services,
              you agree to be bound by these terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              2. Acceptance of Terms
            </h2>
            <p>
              By creating an account, booking an appointment, or using any of
              our services, you acknowledge that you have read, understood, and
              agree to be bound by these Terms and Conditions, as well as our
              Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              3. User Responsibilities
            </h2>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>
                You are responsible for maintaining the confidentiality of your
                account credentials
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
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              4. Appointment Booking and Cancellation
            </h2>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>
                Appointments are subject to availability and confirmation by our
                staff
              </li>
              <li>
                We reserve the right to reschedule or cancel appointments due to
                unforeseen circumstances
              </li>
              <li>Patients should arrive on time for scheduled appointments</li>
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
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              5. Medical Information and Records
            </h2>
            <ul className="list-disc list-inside space-y-2 ml-4">
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
                Your medical information may be shared with healthcare providers
                involved in your care
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              6. Data Privacy and Security
            </h2>
            <p>
              We comply with the Data Privacy Act of 2012 (RA 10173) and
              implement appropriate technical and organizational measures to
              protect your personal information. For detailed information about
              how we collect, use, and protect your data, please refer to our
              Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              7. Use of Services
            </h2>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Our services are intended for lawful purposes only</li>
              <li>
                You agree not to misuse or attempt to gain unauthorized access
                to our systems
              </li>
              <li>
                You will not use our services to transmit harmful, offensive, or
                illegal content
              </li>
              <li>
                We reserve the right to suspend or terminate accounts that
                violate these terms
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              8. Limitation of Liability
            </h2>
            <p>
              While we strive to provide accurate and reliable services, we
              cannot guarantee uninterrupted or error-free operation. We are not
              liable for any indirect, incidental, or consequential damages
              arising from your use of our services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              9. Medical Disclaimer
            </h2>
            <p>
              Our platform facilitates appointment booking and healthcare
              management but does not provide medical advice, diagnosis, or
              treatment. Always seek the advice of qualified healthcare
              professionals regarding any medical questions or conditions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              10. Changes to Terms
            </h2>
            <p>
              We reserve the right to modify these Terms and Conditions at any
              time. Changes will be effective immediately upon posting. Your
              continued use of our services after changes are posted constitutes
              acceptance of the modified terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              11. Governing Law
            </h2>
            <p>
              These Terms and Conditions are governed by and construed in
              accordance with the laws of the Republic of the Philippines. Any
              disputes arising from these terms shall be subject to the
              exclusive jurisdiction of Philippine courts.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              12. Contact Information
            </h2>
            <p>
              If you have any questions about these Terms and Conditions, please
              contact us through the clinic's official contact channels.
            </p>
          </section>
        </div>

        <div className="mt-8 pt-6 border-t">
          <Button
            onClick={handleClose}
            className="bg-[#79c942] hover:bg-[#6bb33a]"
          >
            I Understand
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TermsAndConditions;
