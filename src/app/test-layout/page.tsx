export default function TestLayoutPage() {
  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold text-red-600 mb-4">Test Layout</h1>
      <p className="text-lg">If you see this with red text and proper spacing, Tailwind is working.</p>
      <div className="mt-4 p-4 bg-blue-100 rounded-lg">
        <p className="text-blue-800">This blue box should be visible if Tailwind CSS is processing correctly.</p>
      </div>
    </div>
  )
}
