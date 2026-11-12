import DecryptedText from "@/components/reactbits/DecryptedText";
import { textVariants } from "@/components/typography/Text";
import { cn } from "@/lib/utils";

type PageTitleProps = { text: string; className?: string; as?: "h1" | "h2" };

export function PageTitle({ text, className, as: Tag = "h1" }: PageTitleProps) {
  return (
    <Tag className={cn(textVariants({ variant: "headline" }), className)}>
      <DecryptedText text={text} animateOn="inViewHover" sequential revealDirection="start" speed={40} encryptedClassName="text-primary-300" />
    </Tag>
  );
}
