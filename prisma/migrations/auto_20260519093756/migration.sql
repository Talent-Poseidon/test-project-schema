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
    "eventType" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "KamusEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StandarJabatan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StandarJabatan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StandarJabatanItem" (
    "id" TEXT NOT NULL,
    "standarJabatanId" TEXT NOT NULL,
    "kamusId" TEXT NOT NULL,
    "expectedLevel" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "StandarJabatanItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scenario" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scenarioType" TEXT NOT NULL,
    "description" TEXT,
    "durationMin" INTEGER,
    "instructions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Scenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScenarioItem" (
    "id" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "kamusId" TEXT NOT NULL,

    CONSTRAINT "ScenarioItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Kamus_code_key" ON "Kamus"("code");

-- CreateIndex
CREATE UNIQUE INDEX "StandarJabatan_name_key" ON "StandarJabatan"("name");

-- CreateIndex
CREATE UNIQUE INDEX "StandarJabatanItem_standarJabatanId_kamusId_key" ON "StandarJabatanItem"("standarJabatanId", "kamusId");

-- CreateIndex
CREATE UNIQUE INDEX "Scenario_name_key" ON "Scenario"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ScenarioItem_scenarioId_kamusId_key" ON "ScenarioItem"("scenarioId", "kamusId");

-- AddForeignKey
ALTER TABLE "StandarJabatanItem" ADD CONSTRAINT "StandarJabatanItem_standarJabatanId_fkey" FOREIGN KEY ("standarJabatanId") REFERENCES "StandarJabatan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StandarJabatanItem" ADD CONSTRAINT "StandarJabatanItem_kamusId_fkey" FOREIGN KEY ("kamusId") REFERENCES "Kamus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScenarioItem" ADD CONSTRAINT "ScenarioItem_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "Scenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScenarioItem" ADD CONSTRAINT "ScenarioItem_kamusId_fkey" FOREIGN KEY ("kamusId") REFERENCES "Kamus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

