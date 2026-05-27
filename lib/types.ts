import type * as React from "react";

export type WithChildren<T = {}> = T & {
  children: React.ReactNode;
};
