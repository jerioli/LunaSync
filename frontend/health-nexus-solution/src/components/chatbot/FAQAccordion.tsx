import React from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpCircle, MessageCircle } from "lucide-react";

interface FAQ {
  id: number;
  question: string;
  answer: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface FAQAccordionProps {
  faqs: FAQ[];
  onBackToMainMenu: () => void;
}

export const FAQAccordion: React.FC<FAQAccordionProps> = ({ 
  faqs, 
  onBackToMainMenu 
}) => {
  if (!faqs || faqs.length === 0) {
    return (
      <Card className="max-w-2xl mx-auto border-green-200 shadow-lg bg-white">
        <CardHeader className="bg-gradient-to-r from-green-50 via-green-100 to-green-50 border-b border-green-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-600 rounded-full">
              <HelpCircle className="h-4 w-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-green-800 text-lg font-semibold">Frequently Asked Questions</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8 text-center">
          <div className="p-4 bg-green-50 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
            <MessageCircle className="h-10 w-10 text-green-400" />
          </div>
          <p className="text-gray-700 mb-2 font-medium">No frequently asked questions available at the moment.</p>
          <p className="text-sm text-gray-500 mb-6">Please check back later or contact us directly for assistance.</p>
          <Button
            onClick={onBackToMainMenu}
            className="bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg transition-all duration-200 font-medium"
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            Back to Main Menu
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-none border-green-200 shadow-lg bg-white">
      <CardHeader className="bg-gradient-to-r from-green-50 via-green-100 to-green-50 border-b border-green-200 py-2">
        <div className="flex items-center gap-2">
          <div className="p-1 bg-green-600 rounded-full">
            <HelpCircle className="h-3 w-3 text-white" />
          </div>
          <div>
            <CardTitle className="text-green-800 text-xs font-semibold">Frequently Asked Questions</CardTitle>
            <CardDescription className="text-green-700 text-xs">
              Click on any question to see the answer
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, index) => (
            <AccordionItem 
              key={faq.id} 
              value={`faq-${faq.id}`}
              className={`border-b border-green-100 last:border-b-0 transition-all duration-200 hover:bg-green-50/30`}
            >
              <AccordionTrigger className="px-4 py-3 text-left hover:bg-green-50 hover:no-underline transition-all duration-200 text-gray-800 font-medium group">
                <span className="pr-2 text-xs leading-tight group-hover:text-green-700 transition-colors">
                  {faq.question}
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-3 pt-0 animate-in slide-in-from-top-1 duration-200">
                <div className="text-xs text-gray-700 leading-relaxed bg-gradient-to-r from-green-50 to-green-50/70 p-2 rounded border-l-2 border-green-300">
                  <div className="whitespace-pre-line">
                    {faq.answer}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        
        <div className="p-3 bg-gradient-to-r from-green-50 to-green-100 border-t border-green-200">
          <Button
            onClick={onBackToMainMenu}
            className="w-full bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg transition-all duration-200 font-medium text-xs py-2"
            size="sm"
          >
            <MessageCircle className="h-3 w-3 mr-1" />
            Back to Main Menu
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};