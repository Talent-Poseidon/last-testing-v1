-- CreateTable
CREATE TABLE "Kamus" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "behavioralIndicators" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "Kamus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KamusEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KamusEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StandarJabatan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StandarJabatan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StandarJabatanKamus" (
    "standarJabatanId" TEXT NOT NULL,
    "kamusId" TEXT NOT NULL,
    "expectedLevel" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "StandarJabatanKamus_pkey" PRIMARY KEY ("standarJabatanId","kamusId")
);

-- CreateTable
CREATE TABLE "Scenario" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'simulation',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Scenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScenarioKamus" (
    "scenarioId" TEXT NOT NULL,
    "kamusId" TEXT NOT NULL,

    CONSTRAINT "ScenarioKamus_pkey" PRIMARY KEY ("scenarioId","kamusId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Kamus_code_key" ON "Kamus"("code");

-- AddForeignKey
ALTER TABLE "StandarJabatanKamus" ADD CONSTRAINT "StandarJabatanKamus_standarJabatanId_fkey" FOREIGN KEY ("standarJabatanId") REFERENCES "StandarJabatan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StandarJabatanKamus" ADD CONSTRAINT "StandarJabatanKamus_kamusId_fkey" FOREIGN KEY ("kamusId") REFERENCES "Kamus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScenarioKamus" ADD CONSTRAINT "ScenarioKamus_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "Scenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScenarioKamus" ADD CONSTRAINT "ScenarioKamus_kamusId_fkey" FOREIGN KEY ("kamusId") REFERENCES "Kamus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

