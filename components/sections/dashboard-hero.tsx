"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { fadeInUp, staggerContainer } from "@/lib/client/motion";

const MotionDiv = motion.div;

export function DashboardHero() {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-background via-background to-muted/60 p-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_color-mix(in_oklch,_var(--primary)_15%,_transparent)_0%,_transparent_55%)]" />
      <MotionDiv
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="relative flex flex-col gap-6"
      >
        <MotionDiv variants={fadeInUp} className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            RAG Operations Center
          </p>
          <h1 className="mt-4 text-balance font-heading text-3xl font-semibold text-foreground sm:text-4xl">
            Orchestrate retrieval, evaluation, and agent routing in one ambient workspace.
          </h1>
          <p className="mt-4 text-base text-muted-foreground">
            Monitor ingestion health, tune prompt stacks, and track knowledge freshness across
            every customer deployment.
          </p>
        </MotionDiv>
        <MotionDiv variants={fadeInUp} className="flex flex-wrap gap-3">
          <Button asChild className="gap-2">
            <Link href="/chat">
              Launch chat studio
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/retrieval">View pipelines</Link>
          </Button>
        </MotionDiv>
      </MotionDiv>
    </section>
  );
}
