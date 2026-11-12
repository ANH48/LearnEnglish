import { splitBold } from "./lesson-blocks";

/** Renders "a **b** c" with the marked part in bold. Plain React text, so nothing in it can inject HTML. */
export function BoldText({ text }: { text: string }) {
  return (
    <>
      {splitBold(text).map((piece, index) =>
        piece.bold ? (
          <strong key={index} className="font-bold">
            {piece.text}
          </strong>
        ) : (
          <span key={index}>{piece.text}</span>
        ),
      )}
    </>
  );
}
