import { suite, test } from '@testdeck/mocha';
import {parseTransforms} from "../src/parser";
import chai from 'chai';
import fs from "fs";
chai.should();

@suite class ParserTests {
    @test 'should be backward compatible'() {
        const rawdata = fs.readFileSync('conf/conf.json').toString();
        const config = JSON.parse(rawdata);
        parseTransforms(config,false).should.be.not.undefined
    }
}