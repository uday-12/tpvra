"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { FileCheck, Users, BarChart3, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

import carouselSecurity from "@/assets/carousel-security.jpg";
import carouselMonitoring from "@/assets/carousel-monitoring.jpg";
import carouselAutomation from "@/assets/carousel-automation.jpg";

const CAROUSEL_SLIDES = [
    {
        title: "Automated Vendor Compliance",
        description: "Reduce manual effort with a unified platform for submissions, evidence collection, and risk tracking.",
        image: carouselSecurity,
        icon: FileCheck,
    },
    {
        title: "Streamlined Vendor Collaboration",
        description: "Enable faster reviews with real-time clarifications, structured questionnaires, and transparent communication.",
        image: carouselMonitoring,
        icon: Users,
    },
    {
        title: "Data-Driven Risk Evaluation",
        description: "Make informed decisions using risk scoring, audit logs, and performance insights across all vendor engagements.",
        image: carouselAutomation,
        icon: BarChart3,
    },
];

export function AuthCarousel() {
    const [currentSlide, setCurrentSlide] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % CAROUSEL_SLIDES.length);
        }, 5000);
        return () => clearInterval(timer);
    }, []);

    const nextSlide = () => {
        setCurrentSlide((prev) => (prev + 1) % CAROUSEL_SLIDES.length);
    };

    const prevSlide = () => {
        setCurrentSlide((prev) => (prev === 0 ? CAROUSEL_SLIDES.length - 1 : prev - 1));
    };

    return (
        <div className="relative h-full w-full overflow-hidden bg-slate-950">
            {CAROUSEL_SLIDES.map((slide, index) => (
                <div
                    key={index}
                    className={cn(
                        "absolute inset-0 transition-opacity duration-1000 ease-in-out",
                        index === currentSlide ? "opacity-100" : "opacity-0 pointer-events-none"
                    )}
                >
                    <Image
                        src={slide.image}
                        alt={slide.title}
                        fill
                        priority={index === 0}
                        sizes="100vw"
                        className="object-cover opacity-50"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />

                    <div className="absolute inset-0 flex flex-col justify-center px-12 lg:px-20">
                        <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-600 shadow-lg shadow-orange-600/20">
                            <slide.icon className="h-8 w-8 text-white" />
                        </div>
                        <h2 className="mb-4 max-w-lg text-4xl font-bold tracking-tight text-white lg:text-5xl">
                            {slide.title}
                        </h2>
                        <p className="max-w-md text-lg text-slate-300">
                            {slide.description}
                        </p>
                    </div>
                </div>
            ))}

            {/* Navigation Indicators */}
            <div className="absolute bottom-12 left-12 flex items-center gap-2 lg:left-20">
                {CAROUSEL_SLIDES.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => setCurrentSlide(index)}
                        className={cn(
                            "h-1.5 transition-all duration-300 rounded-full",
                            index === currentSlide ? "w-8 bg-white" : "w-2 bg-white/30"
                        )}
                        aria-label={`Go to slide ${index + 1}`}
                    />
                ))}
                <div className="ml-8 flex gap-4">
                    <button
                        onClick={prevSlide}
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white backdrop-blur-sm transition-colors hover:bg-white/10"
                        aria-label="Previous slide"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                        onClick={nextSlide}
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white backdrop-blur-sm transition-colors hover:bg-white/10"
                        aria-label="Next slide"
                    >
                        <ChevronRight className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
